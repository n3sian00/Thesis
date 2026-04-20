import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDateTimeHelsinki } from '@/lib/dates'
import { cancelBookingAction } from '@/app/actions/bookings'
import { removeWaitlistAction } from '@/app/actions/waitlist'
import BookingsFilter from '@/components/dashboard/BookingsFilter'
import { Suspense } from 'react'

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

// Next.js 16: searchParams on Promise
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams

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

  // Rakennetaan kysely suodattimien perusteella
  let query = supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('business_id', business.id)
    .order('starts_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  // Tekstihaku: nimi tai sähköposti (Supabase ilike)
  if (q?.trim()) {
    query = query.or(
      `customer_name.ilike.%${q.trim()}%,customer_email.ilike.%${q.trim()}%`
    )
  }

  // Suodatettaessa ladataan enemmän tuloksia
  const limit = q || status ? 200 : 50
  const { data: bookings } = await query.limit(limit)

  // Haetaan jonotuslista palveluiden nimillä
  const { data: waitlist } = await supabase
    .from('waitlist')
    .select('id, customer_name, customer_email, created_at, services(name)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  const isFiltered = !!(q || status)
  const now = new Date()

  const tulevat = bookings?.filter(
    (b) => new Date(b.starts_at) >= now && b.status === 'confirmed'
  ) ?? []

  const menneet = bookings?.filter(
    (b) => new Date(b.starts_at) < now || b.status !== 'confirmed'
  ) ?? []

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Varaukset</h1>
        <p className="text-gray-500 mt-1">
          {isFiltered
            ? `${bookings?.length ?? 0} tulosta`
            : tulevat.length > 0
            ? `${tulevat.length} tuleva varaus`
            : 'Ei tulevia varauksia'}
        </p>
      </div>

      {/* Hakupalkki — Suspense tarvitaan useSearchParams-hookin takia */}
      <Suspense>
        <BookingsFilter />
      </Suspense>

      {isFiltered ? (
        /* Suodatettu: yksi litteä lista */
        <BookingSection
          otsikko={`Hakutulokset${q ? ` — "${q}"` : ''}${status ? ` (${STATUS_LABELS[status] ?? status})` : ''}`}
          bookings={bookings ?? []}
          tyhjaViesti="Ei varauksia hakuehdoilla."
          showCancel
        />
      ) : (
        /* Oletustila: tulevat + menneet */
        <>
          <BookingSection
            otsikko="Tulevat varaukset"
            bookings={tulevat}
            tyhjaViesti="Ei tulevia varauksia."
            showCancel
          />

          {menneet.length > 0 && (
            <BookingSection
              otsikko="Aiemmat varaukset"
              bookings={menneet}
              tyhjaViesti=""
              dim
            />
          )}
        </>
      )}

      {/* Jonotuslista */}
      {!isFiltered && (
        <WaitlistSection waitlist={waitlist ?? []} />
      )}
    </div>
  )
}

type WaitlistEntry = {
  id: string
  customer_name: string
  customer_email: string
  created_at: string
  services: { name: string } | { name: string }[] | null
}

function WaitlistSection({ waitlist }: { waitlist: WaitlistEntry[] }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-600 mb-2">
        Jonotuslista{waitlist.length > 0 ? ` (${waitlist.length})` : ''}
      </h2>

      {waitlist.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center shadow-sm">
          <p className="text-gray-400 text-sm">Ei jonottajia.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {waitlist.map((entry) => {
            const serviceName = Array.isArray(entry.services)
              ? entry.services[0]?.name
              : (entry.services as { name: string } | null)?.name

            return (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{entry.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {serviceName ?? 'Palvelu'} &middot; {entry.customer_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('fi-FI', {
                        day: 'numeric', month: 'numeric', year: 'numeric',
                        timeZone: 'Europe/Helsinki',
                      })}
                    </p>
                    <form action={async () => { await removeWaitlistAction(entry.id) }}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-red-600 hover:bg-red-50
                                   px-2.5 py-1 rounded-lg transition-colors border border-gray-200
                                   hover:border-red-200 whitespace-nowrap"
                      >
                        Poista
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
  showCancel = false,
}: {
  otsikko: string
  bookings: Booking[]
  tyhjaViesti: string
  dim?: boolean
  showCancel?: boolean
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
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

                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm text-gray-500 tabular-nums whitespace-nowrap">
                      {formatDateTimeHelsinki(booking.starts_at, 'long')}
                    </p>

                    {showCancel && booking.status === 'confirmed' && (
                      <form action={cancelBookingAction}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50
                                     px-2.5 py-1 rounded-lg transition-colors border border-red-200
                                     hover:border-red-300 whitespace-nowrap"
                        >
                          Peruuta
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
