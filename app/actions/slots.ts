'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Apufunktio: hakee kirjautuneen käyttäjän oman businessId:n
async function getOwnBusinessId(): Promise<{ supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; businessId: string | null }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, businessId: null }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return { supabase, businessId: business?.id ?? null }
}

// Lisää uusi aikaikkuna tietylle päivälle
// Kutsutaan suoraan CalendarView-komponentista (Server Action)
export async function addSlotAction(data: {
  date: string       // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string   // HH:MM
}): Promise<string | null> {
  const { date, start_time, end_time } = data

  if (!date || !start_time || !end_time) return 'Täytä kaikki kentät.'

  // Validoidaan aikaikkuna JS-puolella ennen DB-kutsua
  const [sh, sm] = start_time.split(':').map(Number)
  const [eh, em] = end_time.split(':').map(Number)
  const durationMins = eh * 60 + em - (sh * 60 + sm)

  if (durationMins <= 0) return 'Lopetusajan tulee olla alkuajan jälkeen.'
  if (durationMins < 30) return 'Aikaikkunan tulee olla vähintään 30 minuuttia.'

  const { supabase, businessId } = await getOwnBusinessId()
  if (!businessId) return 'Kirjaudu ensin sisään.'

  // Tarkistetaan päällekkäiset ikkunat samalle päivälle
  const { data: overlapping } = await supabase
    .from('available_slots')
    .select('id, start_time, end_time')
    .eq('business_id', businessId)
    .eq('date', date)
    .lt('start_time', end_time)   // olemassaoleva alkaa ennen uuden loppua
    .gt('end_time', start_time)   // olemassaoleva loppuu uuden alun jälkeen

  if (overlapping && overlapping.length > 0) {
    const o = overlapping[0]
    return `Aikaikkuna päällekkäinen olemassa olevan kanssa (${o.start_time.slice(0, 5)}–${o.end_time.slice(0, 5)}).`
  }

  const { error } = await supabase.from('available_slots').insert({
    business_id: businessId,
    date,
    start_time,
    end_time,
  })

  if (error) {
    if (error.code === '23505') return 'Täsmälleen sama aikaikkuna on jo olemassa.'
    return 'Aikaikkunan lisääminen epäonnistui.'
  }

  revalidatePath('/dashboard/calendar')
  return null
}

// Poistaa aikaikkunan — estää poiston jos siihen osuu varauksia
export async function deleteSlotAction(slotId: string): Promise<string | null> {
  const { supabase, businessId } = await getOwnBusinessId()
  if (!businessId) return 'Kirjaudu ensin sisään.'

  // Haetaan ikkuna — RLS varmistaa omistajuuden (palauttaa null jos ei omistaja)
  const { data: slot } = await supabase
    .from('available_slots')
    .select('business_id, date, start_time, end_time')
    .eq('id', slotId)
    .single()

  if (!slot) return 'Aikaikkunaa ei löydy.'

  // Tarkistetaan ettei ikkunaan osu vahvistettuja varauksia
  // Rakennetaan UTC-aikaleimat vertailua varten
  const slotStart = `${slot.date}T${slot.start_time}Z`
  const slotEnd = `${slot.date}T${slot.end_time}Z`

  const { data: conflicting } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', slot.business_id)
    .eq('status', 'confirmed')
    .lt('starts_at', slotEnd)
    .gt('ends_at', slotStart)
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return 'Aikaikkunalle on varauksia — peru varaukset ensin Varaukset-sivulla.'
  }

  const { error } = await supabase
    .from('available_slots')
    .delete()
    .eq('id', slotId)

  if (error) return 'Poistaminen epäonnistui.'

  revalidatePath('/dashboard/calendar')
  return null
}
