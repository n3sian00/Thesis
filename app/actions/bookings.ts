'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendBookingCancellationToCustomer, sendWaitlistNotificationToCustomer } from '@/lib/email'
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
    console.error('Varauksen peruutus epäonnistui:', error)
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
    console.error('Sähköpostilähetys epäonnistui (varaus peruutettu):', err)
  })
}
