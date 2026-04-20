import { anthropic, CLAUDE_MODEL, buildSystemPrompt } from '@/lib/claude'
import { createAdminClient } from '@/lib/supabase/server'

// Viestityyppi — sama rakenne kuin Anthropicin API odottaa
type Message = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  console.log('[chat] POST alkaa')

  let body: { messages: Message[]; businessId: string }
  try {
    body = await request.json()
  } catch (err) {
    console.error('[chat] request.json() epäonnistui:', err)
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const { messages, businessId } = body

  if (!messages?.length || !businessId) {
    console.error('[chat] Puutteelliset parametrit', { messages: messages?.length, businessId })
    return Response.json({ error: 'Puutteelliset parametrit.' }, { status: 400 })
  }

  console.log('[chat] ANTHROPIC_API_KEY asetettu:', !!process.env.ANTHROPIC_API_KEY)

  // Haetaan yrityksen tiedot ja palvelut palvelinpuolella (admin client ohittaa RLS)
  const supabase = createAdminClient()
  console.log('[chat] Supabase admin client luotu')

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .single()

  if (bizError) console.error('[chat] Yrityksen haku epäonnistui:', bizError)

  if (!business) {
    return Response.json({ error: 'Yritystä ei löydy.' }, { status: 404 })
  }

  console.log('[chat] Yritys löytyi:', business.name)

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name')

  console.log('[chat] Palveluita löytyi:', services?.length ?? 0)

  const systemPrompt = buildSystemPrompt(business.name, services ?? [])

  // Puhdistetaan viestihistoria: poistetaan tyhjät viestit ja rajoitetaan pituus
  const claudeMessages = messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-20)

  console.log('[chat] Lähetetään Claudelle', claudeMessages.length, 'viestiä, malli:', CLAUDE_MODEL)

  const encoder = new TextEncoder()

  // Async generaattori tuottaa tekstipalat Anthropic-streamista.
  async function* textChunks() {
    console.log('[chat] textChunks: aloitetaan Anthropic-stream')
    try {
      const anthropicStream = anthropic.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
      })

      for await (const event of anthropicStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield encoder.encode(event.delta.text)
        }
      }
      console.log('[chat] textChunks: stream valmis')
    } catch (err) {
      console.error('[chat] textChunks: Anthropic-virhe:', err)
      throw err
    }
  }

  function iteratorToStream(iterator: AsyncGenerator<Uint8Array>) {
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await iterator.next()
          if (done) {
            controller.close()
          } else {
            controller.enqueue(value)
          }
        } catch (err) {
          console.error('[chat] iteratorToStream pull-virhe:', err)
          controller.error(err)
        }
      },
    })
  }

  console.log('[chat] Palautetaan streaming-vastaus')

  const stream = iteratorToStream(textChunks())

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
