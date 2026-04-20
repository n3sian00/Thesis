import { createSupabaseServerClient } from '@/lib/supabase/server'

// --- GET /api/slots ---
// Kaksi käyttötarkoitusta kalenterinäkymälle:
//
//   ?month=YYYY-MM  → palauttaa listan päivistä joilla on aikaikkunoita
//   ?date=YYYY-MM-DD → palauttaa kyseisen päivän ikkunat + varaukset
//
// Vaatii kirjautumisen — businessId luetaan sessiosta, ei querysta.

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Kirjautuminen vaaditaan.' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) {
    return Response.json({ error: 'Yritystietoja ei löydy.' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  const date = searchParams.get('date')   // YYYY-MM-DD

  // --- Kuukausidatan haku: mitkä päivät sisältävät aikaikkunoita ---
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return Response.json({ error: 'Virheellinen kuukausi.' }, { status: 400 })
    }

    const [year, mon] = month.split('-').map(Number)
    const firstDay = `${month}-01`
    // Kuukauden viimeinen päivä
    const lastDay = new Date(year, mon, 0).toISOString().split('T')[0]

    const [{ data: slots }, { data: blocked }] = await Promise.all([
      supabase
        .from('available_slots')
        .select('date')
        .eq('business_id', business.id)
        .gte('date', firstDay)
        .lte('date', lastDay),

      supabase
        .from('blocked_slots')
        .select('date')
        .eq('business_id', business.id)
        .gte('date', firstDay)
        .lte('date', lastDay),
    ])

    // Palautetaan uniikit listat päivistä
    const dates = [...new Set((slots ?? []).map((s) => s.date as string))].sort()
    const blockedDates = [...new Set((blocked ?? []).map((b) => b.date as string))].sort()

    return Response.json({ dates, blockedDates })
  }

  // --- Päiväkohtainen haku: ikkunat + varaukset ---
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Virheellinen päivämäärä.' }, { status: 400 })
    }

    // Haetaan aikaikkunat, varaukset ja blokatut ajat rinnakkain
    const [{ data: rawWindows }, { data: rawBookings }, { data: rawBlocked }] = await Promise.all([
      supabase
        .from('available_slots')
        .select('id, start_time, end_time')
        .eq('business_id', business.id)
        .eq('date', date)
        .order('start_time', { ascending: true }),

      supabase
        .from('bookings')
        .select('id, starts_at, ends_at, customer_name, services(name)')
        .eq('business_id', business.id)
        .eq('status', 'confirmed')
        .gte('starts_at', `${date}T00:00:00.000Z`)
        .lte('starts_at', `${date}T23:59:59.999Z`)
        .order('starts_at', { ascending: true }),

      supabase
        .from('blocked_slots')
        .select('id, slot_time')
        .eq('business_id', business.id)
        .eq('date', date)
        .order('slot_time', { ascending: true }),
    ])

    // Merkitään onko ikkunalla varauksia (estää poiston)
    const windows = (rawWindows ?? []).map((w) => {
      const wStart = `${date}T${w.start_time}Z`
      const wEnd = `${date}T${w.end_time}Z`
      const has_bookings = (rawBookings ?? []).some(
        (b) => b.starts_at < wEnd && b.ends_at > wStart
      )
      return {
        id: w.id as string,
        start_time: (w.start_time as string).slice(0, 5), // HH:MM
        end_time: (w.end_time as string).slice(0, 5),
        has_bookings,
      }
    })

    const bookings = (rawBookings ?? []).map((b) => ({
      id: b.id as string,
      starts_at: b.starts_at as string,
      ends_at: b.ends_at as string,
      customer_name: b.customer_name as string,
      service_name: Array.isArray(b.services)
        ? (b.services[0] as { name: string } | undefined)?.name ?? 'Palvelu'
        : (b.services as { name: string } | null)?.name ?? 'Palvelu',
    }))

    const blocked = (rawBlocked ?? []).map((b) => ({
      id: b.id as string,
      slot_time: (b.slot_time as string).slice(0, 5), // HH:MM
    }))

    return Response.json({ windows, bookings, blocked })
  }

  return Response.json({ error: 'Puuttuu month tai date -parametri.' }, { status: 400 })
}
