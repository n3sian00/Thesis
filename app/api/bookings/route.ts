import { createAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

// Aukioloajat päiväindeksillä (0=su, 1=ma, ..., 6=la)
// null = suljettu, open/close tunneissa (esim. 9 = 09:00, 17 = 17:00)
const AUKIOLOAJAT: Record<number, { open: number; close: number } | null> = {
  0: null,                      // Sunnuntai: suljettu
  1: { open: 9, close: 17 },   // Maanantai
  2: { open: 9, close: 17 },   // Tiistai
  3: { open: 9, close: 17 },   // Keskiviikko
  4: { open: 9, close: 17 },   // Torstai
  5: { open: 9, close: 17 },   // Perjantai
  6: { open: 9, close: 14 },   // Lauantai
}

// Vapaiden aikaslottien väli minuuteissa
const SLOT_INTERVAL = 30

// --- GET /api/bookings?business_id=&service_id=&date=YYYY-MM-DD ---
// Palauttaa vapaat aikaslotit annetulle päivälle
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const serviceId = searchParams.get('service_id')
  const dateStr = searchParams.get('date') // YYYY-MM-DD

  if (!businessId || !serviceId || !dateStr) {
    return Response.json({ error: 'Puutteelliset parametrit.' }, { status: 400 })
  }

  // Validoidaan päivämääräformaatti
  const date = new Date(dateStr + 'T00:00:00')
  if (isNaN(date.getTime())) {
    return Response.json({ error: 'Virheellinen päivämäärä.' }, { status: 400 })
  }

  // Admin client — tarvitaan olemassa olevien varausten lukemiseen (ei public SELECT)
  const supabase = createAdminClient()

  // Haetaan palvelun kesto
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .eq('active', true)
    .single()

  if (!service) {
    return Response.json({ error: 'Palvelua ei löydy.' }, { status: 404 })
  }

  const durationMinutes = service.duration_minutes

  // Tarkistetaan aukioloajat
  const dayOfWeek = date.getDay()
  const hours = AUKIOLOAJAT[dayOfWeek]

  if (!hours) {
    return Response.json({ slots: [] }) // Suljettu päivä
  }

  // Haetaan kyseisen päivän olemassa olevat vahvistetut varaukset
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('starts_at, ends_at')
    .eq('business_id', businessId)
    .eq('status', 'confirmed')
    .gte('starts_at', dayStart.toISOString())
    .lte('starts_at', dayEnd.toISOString())

  const nyt = new Date()

  // Generoidaan kaikki mahdolliset slotit 30 min välein
  const slots: string[] = []
  let currentMinutes = hours.open * 60

  while (currentMinutes + durationMinutes <= hours.close * 60) {
    const slotStart = new Date(date)
    slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)

    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes)

    // Ohitetaan menneet ajat (pieni puskuri: 30 min)
    if (slotStart > new Date(nyt.getTime() + 30 * 60 * 1000)) {
      // Tarkistetaan päällekkäisyys olemassa olevien varausten kanssa
      const hasOverlap = (existingBookings ?? []).some((booking) => {
        const bookingStart = new Date(booking.starts_at)
        const bookingEnd = new Date(booking.ends_at)
        return slotStart < bookingEnd && slotEnd > bookingStart
      })

      if (!hasOverlap) {
        slots.push(slotStart.toISOString())
      }
    }

    currentMinutes += SLOT_INTERVAL
  }

  return Response.json({ slots })
}

// --- POST /api/bookings ---
// Luo uuden varauksen Supabaseen
export async function POST(request: Request) {
  const body = await request.json()
  const {
    business_id,
    service_id,
    customer_name,
    customer_email,
    customer_phone,
    starts_at,
  } = body as {
    business_id: string
    service_id: string
    customer_name: string
    customer_email: string
    customer_phone?: string
    starts_at: string
  }

  // Validointi
  if (!business_id || !service_id || !customer_name || !customer_email || !starts_at) {
    return Response.json({ error: 'Puutteelliset tiedot.' }, { status: 400 })
  }

  // Sähköpostivalidointi (yksinkertainen)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
    return Response.json({ error: 'Virheellinen sähköpostiosoite.' }, { status: 400 })
  }

  // Admin client — tarkistetaan päällekkäisyys ennen varauksen luontia
  const supabase = createAdminClient()

  // Haetaan palvelun kesto ends_at-laskentaa varten
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', service_id)
    .eq('business_id', business_id)
    .eq('active', true)
    .single()

  if (!service) {
    return Response.json({ error: 'Palvelua ei löydy.' }, { status: 404 })
  }

  const startsAt = new Date(starts_at)
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000)

  // Tarkistetaan ettei samalle ajalle ole jo varausta
  const { data: conflicting } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', business_id)
    .eq('status', 'confirmed')
    .lt('starts_at', endsAt.toISOString())
    .gt('ends_at', startsAt.toISOString())
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return Response.json(
      { error: 'Valittu aika on jo varattuna. Valitse toinen aika.' },
      { status: 409 }
    )
  }

  // Public client INSERT — toimii julkisen INSERT-policyn kautta
  const publicSupabase = await createSupabaseServerClient()

  const { data: booking, error } = await publicSupabase
    .from('bookings')
    .insert({
      business_id,
      service_id,
      customer_name: customer_name.trim(),
      customer_email: customer_email.toLowerCase().trim(),
      customer_phone: customer_phone?.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
    })
    .select('id, starts_at, ends_at, customer_name, customer_email')
    .single()

  if (error) {
    console.error('Varauksen luonti epäonnistui:', error)
    return Response.json({ error: 'Varauksen luonti epäonnistui.' }, { status: 500 })
  }

  return Response.json({ booking }, { status: 201 })
}
