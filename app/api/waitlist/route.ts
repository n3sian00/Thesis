import { createAdminClient } from '@/lib/supabase/server'

// POST /api/waitlist
// Lisää asiakkaan jonotuslistalle palvelulle.
export async function POST(request: Request) {
  let body: {
    business_id: string
    service_id: string
    customer_name: string
    customer_email: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Virheellinen pyyntö.' }, { status: 400 })
  }

  const { business_id, service_id, customer_name, customer_email } = body

  if (!business_id || !service_id || !customer_name || !customer_email) {
    return Response.json({ error: 'Puutteelliset tiedot.' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
    return Response.json({ error: 'Virheellinen sähköpostiosoite.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Tarkistetaan että yritys ja palvelu ovat olemassa
  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('id', service_id)
    .eq('business_id', business_id)
    .eq('active', true)
    .single()

  if (!service) {
    return Response.json({ error: 'Palvelua ei löydy.' }, { status: 404 })
  }

  // Tarkistetaan onko sama asiakas jo jonossa tälle palvelulle
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('business_id', business_id)
    .eq('service_id', service_id)
    .eq('customer_email', customer_email.toLowerCase().trim())
    .single()

  if (existing) {
    return Response.json({ error: 'Olet jo jonotuslistalla tälle palvelulle.' }, { status: 409 })
  }

  const { error } = await supabase.from('waitlist').insert({
    business_id,
    service_id,
    customer_name: customer_name.trim(),
    customer_email: customer_email.toLowerCase().trim(),
  })

  if (error) {
    console.error('Jonotuslistalle lisääminen epäonnistui:', error)
    return Response.json({ error: 'Jonotuslistalle liittyminen epäonnistui.' }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 201 })
}
