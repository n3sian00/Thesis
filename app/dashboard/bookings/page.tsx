import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDateTimeHelsinki } from '@/lib/dates'

// Värikoodi varauksen tilalle
const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Vahvistettu',
  cancelled: 'Peruutettu',
  completed: 'Toteutunut',
}

export default async function BookingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) return <p className="text-gray-500">Yritystietoja ei löydy.</p>

  // Haetaan kaikki varaukset uusimmasta alkaen
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('business_id', business.id)
    .order('starts_at', { ascending: false })
    .limit(50)

  const now = new Date()

  const tulevat = bookings?.filter(
    (b) => new Date(b.starts_at) >= now && b.status === 'confirmed'
  ) ?? []

  const menneet = bookings?.filter(
    (b) => new Date(b.starts_at) < now || b.status !== 'confirmed'
  ) ?? []

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Varaukset</h1>
        <p className="text-gray-500 mt-1">
          {tulevat.length > 0
            ? `${tulevat.length} tuleva varaus`
            : 'Ei tulevia varauksia'}
        </p>
      </div>

      {/* Tulevat varaukset */}
      <BookingSection
        otsikko="Tulevat varaukset"
        bookings={tulevat}
        tyhjaViesti="Ei tulevia varauksia."
      />

      {/* Menneet / peruutetut */}
      {menneet.length > 0 && (
        <BookingSection
          otsikko="Aiemmat varaukset"
          bookings={menneet}
          tyhjaViesti=""
          dim
        />
      )}
    </div>
  )
}

type Booking = {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  starts_at: string
  ends_at: string
  status: string
  services: { name: string } | { name: string }[] | null
}

function BookingSection({
  otsikko,
  bookings,
  tyhjaViesti,
  dim = false,
}: {
  otsikko: string
  bookings: Booking[]
  tyhjaViesti: string
  dim?: boolean
}) {
  return (
    <div>
      <h2 className={`text-sm font-medium mb-2 ${dim ? 'text-gray-400' : 'text-gray-600'}`}>
        {otsikko}
      </h2>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center shadow-sm">
          <p className="text-gray-400 text-sm">{tyhjaViesti}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {bookings.map((booking) => {
            const serviceName = Array.isArray(booking.services)
              ? booking.services[0]?.name
              : (booking.services as { name: string } | null)?.name

            const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-500'
            const statusLabel = STATUS_LABELS[booking.status] ?? booking.status

            return (
              <div
                key={booking.id}
                className={`px-5 py-4 ${dim ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">
                        {booking.customer_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {serviceName ?? 'Palvelu'} &middot; {booking.customer_email}
                      {booking.customer_phone && ` · ${booking.customer_phone}`}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 tabular-nums whitespace-nowrap shrink-0">
                    {formatDateTimeHelsinki(booking.starts_at, 'long')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
