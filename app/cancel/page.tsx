import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCancelToken } from '@/lib/tokens'
import { cancelCustomerBookingAction } from '@/app/actions/cancel-customer'

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string; cancelled?: string }>
}) {
  const { id: bookingId, token, cancelled } = await searchParams

  if (!bookingId || !token) notFound()

  const valid = await verifyCancelToken(bookingId, token)
  if (!valid) notFound()

  if (cancelled === '1') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-800 mb-2">Varaus peruutettu</p>
          <p className="text-sm text-gray-500">Saat vahvistuksen sähköpostiisi.</p>
        </div>
      </main>
    )
  }

  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, customer_name, starts_at, status,
      services ( name ),
      businesses ( name, cancellation_hours )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) notFound()

  const serviceName = Array.isArray(booking.services)
    ? (booking.services[0]?.name ?? 'Palvelu')
    : ((booking.services as { name: string } | null)?.name ?? 'Palvelu')

  const businessInfo = Array.isArray(booking.businesses)
    ? booking.businesses[0]
    : (booking.businesses as { name: string; cancellation_hours: number } | null)

  const businessName       = businessInfo?.name ?? 'Palveluntarjoaja'
  const cancellationHours  = businessInfo?.cancellation_hours ?? 24

  const startsAt   = new Date(booking.starts_at)
  const hoursUntil = (startsAt.getTime() - Date.now()) / 3_600_000
  const canCancel  = booking.status === 'confirmed' && hoursUntil >= cancellationHours

  const dateLabel = startsAt.toLocaleDateString('fi-FI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
  const timeLabel = startsAt.toLocaleTimeString('fi-FI', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki',
  })

  if (booking.status === 'cancelled') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-lg font-semibold text-gray-800 mb-2">Varaus on jo peruutettu</p>
          <p className="text-sm text-gray-500">Tämä varaus on aiemmin peruutettu.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Peru varaus</h1>
        <p className="text-sm text-gray-500 mb-6">{businessName}</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-1">
          <p className="text-sm font-medium text-gray-800">{serviceName}</p>
          <p className="text-sm text-gray-500">{dateLabel} klo {timeLabel}</p>
          <p className="text-xs text-gray-400">{booking.customer_name}</p>
        </div>

        {canCancel ? (
          <>
            <form action={cancelCustomerBookingAction}>
              <input type="hidden" name="booking_id" value={bookingId} />
              <input type="hidden" name="token"      value={token} />
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium text-white rounded-xl
                           bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2
                           focus:ring-red-300 transition-colors"
              >
                Peru varaus
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-3">
              Peruuttaminen on mahdollista {cancellationHours}h ennen varausta.
            </p>
          </>
        ) : (
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-700">Varausta ei voi enää peruuttaa.</p>
            <p className="text-xs text-gray-400">
              Peruutus onnistuu viimeistään {cancellationHours}h ennen varausta.
              Ota yhteyttä suoraan {businessName}:iin.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
