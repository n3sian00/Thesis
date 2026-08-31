import { anthropic, CLAUDE_MODEL, buildSystemPrompt } from '@/lib/claude'
import { createAdminClient } from '@/lib/supabase/server'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { supabaseErr, anthropicErr } from '@/lib/log-error'
import { chatRequestSchema, zodFieldList, type ChatMessage } from '@/lib/validation'

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    console.error('[chat] Virheellinen JSON-body')
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const parsed = chatRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    console.error('[chat] Virheellinen syöte, kentät:', zodFieldList(parsed.error))
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const { messages, businessId } = parsed.data
  const locale = hasLocale(routing.locales, parsed.data.locale)
    ? parsed.data.locale
    : routing.defaultLocale

  // Haetaan yrityksen tiedot ja palvelut palvelinpuolella (admin client ohittaa RLS)
  const supabase = createAdminClient()

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, city, cancellation_hours, general_notes')
    .eq('id', businessId)
    .single()

  if (bizError) console.error('[chat] Yrityksen haku epäonnistui:', supabaseErr(bizError))

  if (!business) {
    return Response.json({ error: 'Yritystä ei löydy.' }, { status: 404 })
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, category, duration_minutes, price')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name')

  const systemPrompt = buildSystemPrompt(business, services ?? [], locale)

  // Puhdistetaan viestihistoria: poistetaan tyhjät viestit ja rajoitetaan pituus
  const claudeMessages: ChatMessage[] = messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-20)

  const encoder = new TextEncoder()

  // Async generaattori tuottaa tekstipalat Anthropic-streamista.
  async function* textChunks() {
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
    } catch (err) {
      console.error('[chat] textChunks: Anthropic-virhe:', anthropicErr(err))
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
          console.error('[chat] iteratorToStream pull-virhe:', anthropicErr(err))
          controller.error(err)
        }
      },
    })
  }

  const stream = iteratorToStream(textChunks())

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
