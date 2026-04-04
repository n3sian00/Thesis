import { anthropic, CLAUDE_MODEL, buildSystemPrompt } from '@/lib/claude'
import { createAdminClient } from '@/lib/supabase/server'

// Viestityyppi — sama rakenne kuin Anthropicin API odottaa
type Message = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  const body = await request.json()
  const { messages, businessId } = body as {
    messages: Message[]
    businessId: string
  }

  if (!messages?.length || !businessId) {
    return Response.json({ error: 'Puutteelliset parametrit.' }, { status: 400 })
  }

  // Haetaan yrityksen tiedot ja palvelut palvelinpuolella (admin client ohittaa RLS)
  // Näin client ei voi manipuloida system promptia
  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .single()

  if (!business) {
    return Response.json({ error: 'Yritystä ei löydy.' }, { status: 404 })
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name')

  const systemPrompt = buildSystemPrompt(business.name, services ?? [])

  // Puhdistetaan viestihistoria: poistetaan tyhjät viestit ja rajoitetaan pituus
  const claudeMessages = messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-20) // Pidetään max 20 viestiä kontekstissa

  // Streaming ReadableStream — enkoodataan teksti pala kerrallaan
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
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
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        // Virheen sattuessa lähetetään virheilmoitus streamissa
        controller.enqueue(
          encoder.encode('Pahoittelen, jokin meni pieleen. Yritä uudelleen.')
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // Nginx: ei puskuroida streamingia
    },
  })
}
