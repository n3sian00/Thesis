'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCancelToken } from '@/lib/tokens'
import {
  sendBookingCancellationToCustomer,
  sendWaitlistNotificationToCustomer,
} from '@/lib/email'

export async function cancelCustomerBookingAction(formData: FormData): Promise<void> {
  const bookingId = formData.get('booking_id') as string
  const token     = formData.get('token')      as string

  if (!bookingId || !token) redirect('/')

  const valid = await verifyCancelToken(bookingId, token)
  if (!valid) redirect('/')

  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, customer_name, customer_email, starts_at, status, service_id, business_id,
      services ( name ),
      businesses ( id, name, slug, cancellation_hours )
    `)
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .single()

  // Ei löydy tai jo peruutettu — näytetään sivu joka kertoo tilanteen
  if (!booking) redirect(`/cancel?id=${bookingId}&token=${token}`)

  const businessInfo = Array.isArray(booking.businesses)
    ? booking.businesses[0]
    : (booking.businesses as { id: string; name: string; slug: string; cancellation_hours: number } | null)

  const cancellationHours = businessInfo?.cancellation_hours ?? 24
  const hoursUntil = (new Date(booking.starts_at).getTime() - Date.now()) / 3_600_000

  if (hoursUntil < cancellationHours) redirect(`/cancel?id=${bookingId}&token=${token}`)

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) redirect(`/cancel?id=${bookingId}&token=${token}`)

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  const businessName = businessInfo?.name ?? 'Palveluntarjoaja'
  const startsAt     = new Date(booking.starts_at)

  const dateLabel = startsAt.toLocaleDateString('fi-FI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
  const timeLabel = startsAt.toLocaleTimeString('fi-FI', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki',
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const bookingUrl = businessInfo?.slug ? `${baseUrl}/${businessInfo.slug}` : baseUrl

  Promise.all([
    sendBookingCancellationToCustomer({
      customerName:  booking.customer_name,
      customerEmail: booking.customer_email,
      serviceName,
      date: dateLabel,
      time: timeLabel,
      businessName,
    }),
    supabase
      .from('waitlist')
      .select('customer_name, customer_email')
      .eq('business_id', booking.business_id)
      .eq('service_id',  booking.service_id)
      .then(({ data: waitlist }) => {
        if (!waitlist?.length) return
        return Promise.all(
          waitlist.map((entry) =>
            sendWaitlistNotificationToCustomer({
              customerName:  entry.customer_name,
              customerEmail: entry.customer_email,
              serviceName,
              businessName,
              bookingUrl,
            })
          )
        )
      }),
  ]).catch((err) => {
    console.error('Sähköpostilähetys epäonnistui (asiakkaan peruutus):', err)
  })

  redirect(`/cancel?id=${bookingId}&token=${token}&cancelled=1`)
}
