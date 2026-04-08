import { createAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { sendBookingConfirmationToCustomer, sendBookingNotificationToOwner } from '@/lib/email'

// Vapaiden aikaslottien väli minuuteissa
const SLOT_INTERVAL = 30

// HUOM: Aikavyöhyke — ajat tallennetaan UTC:na ja käsitellään UTC:na.
// Tuotannossa aseta TZ=Europe/Helsinki (Vercel: Settings → Environment Variables)
// jolloin "09:00" tarkoittaa 09:00 Suomen aikaa.

// --- GET /api/bookings?business_id=&date=YYYY-MM-DD&duration=90 ---
// Palauttaa asiakkaalle vapaat aikaslotit annetulle päivälle.
// duration_minutes tulee query-parametrina — asiakas on jo valinnut palvelun.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const dateStr = searchParams.get('date')       // YYYY-MM-DD
  const durationStr = searchParams.get('duration') // minuutteja

  if (!businessId || !dateStr || !durationStr) {
    return Response.json({ error: 'Puutteelliset parametrit.' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json({ error: 'Virheellinen päivämäärä.' }, { status: 400 })
  }

  const durationMinutes = parseInt(durationStr, 10)
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return Response.json({ error: 'Virheellinen kesto.' }, { status: 400 })
  }

  // Admin client — tarvitaan available_slots ja bookings lukemiseen (ei public SELECT)
  const supabase = createAdminClient()

  // Haetaan yrityksen aikaikkunat tälle päivälle tietokannasta
  const { data: windows } = await supabase
    .from('available_slots')
    .select('start_time, end_time')
    .eq('business_id', businessId)
    .eq('date', dateStr)
    .order('start_time', { ascending: true })

  if (!windows || windows.length === 0) {
    return Response.json({ slots: [] })
  }

  // Haetaan kyseisen päivän vahvistetut varaukset
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('starts_at, ends_at')
    .eq('business_id', businessId)
    .eq('status', 'confirmed')
    .gte('starts_at', `${dateStr}T00:00:00.000Z`)
    .lte('starts_at', `${dateStr}T23:59:59.999Z`)

  const nyt = new Date()
  const durationMs = durationMinutes * 60 * 1000
  const slots: string[] = []

  // Käydään läpi jokainen aikaikkuna ja generoidaan varattavissa olevat slotit
  for (const window of windows) {
    // Rakennetaan UTC-aikaleimat ikkunan alusta ja lopusta
    const windowStart = new Date(`${dateStr}T${window.start_time}Z`)
    const windowEnd = new Date(`${dateStr}T${window.end_time}Z`)
    let current = new Date(windowStart)

    while (current.getTime() + durationMs <= windowEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + durationMs)

      // Ohitetaan jo menneet ajat (30 min puskuri)
      if (current.getTime() > nyt.getTime() + 30 * 60 * 1000) {
        const hasOverlap = (existingBookings ?? []).some((booking) => {
          const bStart = new Date(booking.starts_at)
          const bEnd = new Date(booking.ends_at)
          return current < bEnd && slotEnd > bStart
        })

        if (!hasOverlap) {
          slots.push(current.toISOString())
        }
      }

      current = new Date(current.getTime() + SLOT_INTERVAL * 60 * 1000)
    }
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

  if (!business_id || !service_id || !customer_name || !customer_email || !starts_at) {
    return Response.json({ error: 'Puutteelliset tiedot.' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
    return Response.json({ error: 'Virheellinen sähköpostiosoite.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Haetaan palvelun kesto ja yrityksen tiedot rinnakkain
  const [{ data: service }, { data: business }] = await Promise.all([
    supabase
      .from('services')
      .select('name, duration_minutes')
      .eq('id', service_id)
      .eq('business_id', business_id)
      .eq('active', true)
      .single(),
    supabase
      .from('businesses')
      .select('name, user_id')
      .eq('id', business_id)
      .single(),
  ])

  if (!service) {
    return Response.json({ error: 'Palvelua ei löydy.' }, { status: 404 })
  }

  const startsAt = new Date(starts_at)
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000)

  // Päällekkäisyystarkistus ennen kirjoitusta
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

  // Muotoillaan päivä ja kellonaika sähköposteja varten
  const dateLabel = startsAt.toLocaleDateString('fi-FI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  const timeLabel = startsAt.toLocaleTimeString('fi-FI', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
  const serviceName = service.name as string
  const businessName = (business?.name as string | undefined) ?? ''

  // Haetaan yrittäjän sähköposti auth.users:sta (admin client)
  let ownerEmail: string | null = null
  if (business?.user_id) {
    const { data: ownerUser } = await supabase.auth.admin.getUserById(
      business.user_id as string
    )
    ownerEmail = ownerUser?.user?.email ?? null
  }

  // Lähetetään sähköpostit rinnakkain ennen vastausta
  await Promise.all([
    sendBookingConfirmationToCustomer({
      customerName: customer_name.trim(),
      customerEmail: customer_email.toLowerCase().trim(),
      serviceName,
      date: dateLabel,
      time: timeLabel,
      businessName,
    }),
    ...(ownerEmail
      ? [
          sendBookingNotificationToOwner({
            customerName: customer_name.trim(),
            customerPhone: customer_phone?.trim() || null,
            serviceName,
            date: dateLabel,
            time: timeLabel,
            ownerEmail,
          }),
        ]
      : []),
  ])

  return Response.json({ booking }, { status: 201 })
}
