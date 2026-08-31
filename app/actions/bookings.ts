'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendBookingCancellationToCustomer,
  sendWaitlistNotificationToCustomer,
  sendBookingRescheduleToCustomer,
  sendBookingUpdateToCustomer,
} from '@/lib/email'
import { formatDateTimeHelsinki } from '@/lib/dates'
import { supabaseErr, resendErr } from '@/lib/log-error'
import { revalidatePath } from 'next/cache'

// Peruuttaa varauksen ja lähettää asiakkaalle ilmoituksen.
// Vain yrityksen omistaja voi peruuttaa oman yrityksensä varauksia.
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) return

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .single()

  if (!business) return

  // Haetaan varauksen tiedot sähköpostia varten ennen päivitystä
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('customer_name, customer_email, starts_at, service_id, services(name)')
    .eq('id', bookingId)
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return

  // Päivitetään tila — RLS varmistaa omistajuuden
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('business_id', business.id)

  if (error) {
    console.error('Varauksen peruutus epäonnistui:', supabaseErr(error))
    return
  }

  revalidatePath('/dashboard/bookings')

  const startsAt = new Date(booking.starts_at)
  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kauneusai.fi'
  const bookingUrl = `${baseUrl}/${business.slug}`

  // Sähköpostit fire-and-forget — ei estä paluuta
  Promise.all([
    // 1) Peruutusilmoitus varaajalle
    sendBookingCancellationToCustomer({
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName,
      date: startsAt.toLocaleDateString('fi-FI', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'Europe/Helsinki',
      }),
      time: startsAt.toLocaleTimeString('fi-FI', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki',
      }),
      businessName: business.name,
    }),

    // 2) Ilmoitus jonotuslistalle — haetaan kaikki jonottajat tälle palvelulle
    admin
      .from('waitlist')
      .select('customer_name, customer_email')
      .eq('business_id', business.id)
      .eq('service_id', booking.service_id)
      .then(({ data: waitlist }) => {
        if (!waitlist?.length) return
        return Promise.all(
          waitlist.map((entry) =>
            sendWaitlistNotificationToCustomer({
              customerName: entry.customer_name,
              customerEmail: entry.customer_email,
              serviceName,
              businessName: business.name,
              bookingUrl,
            })
          )
        )
      }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (varaus peruutettu):', resendErr(err))
  })
}

// Siirtää varauksen uuteen ajankohtaan ja lähettää asiakkaalle ilmoituksen.
// Vain yrityksen omistaja voi siirtää oman yrityksensä varauksia, vain vahvistetuille varauksille.
export async function rescheduleBookingAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const bookingId = (formData.get('booking_id') as string)?.trim()
  const newStartsAtRaw = (formData.get('starts_at') as string)?.trim()

  if (!bookingId) return 'Varauksen ID puuttuu.'
  if (!newStartsAtRaw) return 'Uusi ajankohta puuttuu.'

  const newStartsAt = new Date(newStartsAtRaw)
  if (isNaN(newStartsAt.getTime())) return 'Virheellinen ajankohta.'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Kirjaudu ensin sisään.'

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!business) return 'Yritystietoja ei löydy.'

  // Haetaan varauksen ja palvelun tiedot ennen päivitystä (sähköpostia ja kestoa varten)
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('customer_name, customer_email, starts_at, service_id, services(name, duration_minutes)')
    .eq('id', bookingId)
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return 'Varausta ei löydy tai sitä ei voi siirtää.'

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  const durationMinutes = Array.isArray(booking.services)
    ? booking.services[0]?.duration_minutes
    : (booking.services as { duration_minutes: number } | null)?.duration_minutes

  if (!durationMinutes) return 'Palvelun kestoa ei löydy.'

  const newEndsAt = new Date(newStartsAt.getTime() + durationMinutes * 60 * 1000)

  // Päällekkäisyystarkistus — sama logiikka kuin varauksen luonnissa (/api/bookings POST),
  // pois lukien siirrettävä varaus itse
  const { data: conflicting } = await admin
    .from('bookings')
    .select('id')
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .neq('id', bookingId)
    .lt('starts_at', newEndsAt.toISOString())
    .gt('ends_at', newStartsAt.toISOString())
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return 'Valittu aika on jo varattuna. Valitse toinen aika.'
  }

  // Päivitetään ajankohta — RLS varmistaa omistajuuden
  const { error } = await supabase
    .from('bookings')
    .update({ starts_at: newStartsAt.toISOString(), ends_at: newEndsAt.toISOString() })
    .eq('id', bookingId)
    .eq('business_id', business.id)

  if (error) {
    console.error('Varauksen siirto epäonnistui:', supabaseErr(error))
    return 'Varauksen siirto epäonnistui. Yritä uudelleen.'
  }

  revalidatePath('/dashboard/bookings')

  // Sähköposti fire-and-forget — ei estä paluuta
  Promise.all([
    sendBookingRescheduleToCustomer({
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName,
      oldDateTime: formatDateTimeHelsinki(booking.starts_at, 'long'),
      newDateTime: formatDateTimeHelsinki(newStartsAt.toISOString(), 'long'),
      businessName: business.name,
    }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (varaus siirretty):', resendErr(err))
  })

  return null
}

// Muokkaa varauksen asiakastietoja ja lähettää asiakkaalle ilmoituksen.
// Vain yrityksen omistaja voi muokata oman yrityksensä varauksia, vain vahvistetuille varauksille.
export async function updateBookingDetailsAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const bookingId = (formData.get('booking_id') as string)?.trim()
  const customer_name = (formData.get('customer_name') as string)?.trim()
  const customer_email = (formData.get('customer_email') as string)?.trim()
  const customer_phone = (formData.get('customer_phone') as string)?.trim() || null
  const customer_notes = (formData.get('customer_notes') as string)?.trim() || null

  if (!bookingId) return 'Varauksen ID puuttuu.'
  if (!customer_name) return 'Nimi on pakollinen.'
  if (!customer_email) return 'Sähköposti on pakollinen.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) return 'Virheellinen sähköpostiosoite.'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Kirjaudu ensin sisään.'

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!business) return 'Yritystietoja ei löydy.'

  // Haetaan varauksen ja palvelun tiedot ennen päivitystä (sähköpostia varten)
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('starts_at, services(name)')
    .eq('id', bookingId)
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return 'Varausta ei löydy tai sitä ei voi muokata.'

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  // Päivitetään asiakastiedot — RLS varmistaa omistajuuden
  const { error } = await supabase
    .from('bookings')
    .update({ customer_name, customer_email, customer_phone, customer_notes })
    .eq('id', bookingId)
    .eq('business_id', business.id)

  if (error) {
    console.error('Varauksen tietojen tallennus epäonnistui:', supabaseErr(error))
    return 'Varauksen tietojen tallennus epäonnistui. Yritä uudelleen.'
  }

  revalidatePath('/dashboard/bookings')

  // Sähköposti fire-and-forget — ei estä paluuta
  Promise.all([
    sendBookingUpdateToCustomer({
      customerName: customer_name,
      customerEmail: customer_email,
      serviceName,
      dateTime: formatDateTimeHelsinki(booking.starts_at, 'long'),
      businessName: business.name,
    }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (varaus päivitetty):', resendErr(err))
  })

  return null
}
