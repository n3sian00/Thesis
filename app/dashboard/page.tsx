import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTimeHelsinki } from '@/lib/dates'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Haetaan yritys
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('user_id', user!.id)
    .single()

  if (!business) {
    return (
      <p className="text-gray-500">
        Yritystietoja ei löydy. Ota yhteyttä tukeen.
      </p>
    )
  }

  // Haetaan tilastot rinnakkain
  const now = new Date().toISOString()

  const [
    { count: activeServices },
    { count: upcomingBookings },
    { data: nextBookings },
  ] = await Promise.all([
    supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('active', true),

    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('starts_at', now),

    supabase
      .from('bookings')
      .select('id, customer_name, starts_at, service_id, services(name)')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(5),
  ])

  return (
    <div className="space-y-8">

      {/* Otsikko */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Etusivu</h1>
        <p className="text-gray-500 mt-1">Tervetuloa, {business.name}</p>
      </div>

      {/* Tilastokortit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Aktiiviset palvelut"
          value={activeServices ?? 0}
          linkHref="/dashboard/services"
          linkLabel="Hallitse palveluita"
        />
        <StatCard
          label="Tulevat varaukset"
          value={upcomingBookings ?? 0}
          linkHref="/dashboard/bookings"
          linkLabel="Katso kaikki"
        />
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Asiakaslinkkisi</p>
          <a
            href={`/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-pink-600 hover:underline block mt-1 truncate"
          >
            /{business.slug}
          </a>
          <p className="text-xs text-gray-400 mt-1">Jaa asiakkaille</p>
        </div>
      </div>

      {/* Seuraavat varaukset */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Seuraavat varaukset</h2>
          <Link
            href="/dashboard/bookings"
            className="text-sm text-pink-500 hover:text-violet-500 transition-colors"
          >
            Kaikki varaukset
          </Link>
        </div>

        {!nextBookings || nextBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
            <p className="text-gray-400 text-sm">Ei tulevia varauksia.</p>
            <p className="text-gray-400 text-xs mt-1">
              Jaa asiakaslinkkisi niin varaukset alkavat kertyä!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {nextBookings.map((booking) => {
              // Supabase palauttaa join-datan arrayna tai objektina — käsitellään molemmat
              const serviceName = Array.isArray(booking.services)
                ? booking.services[0]?.name
                : (booking.services as { name: string } | null)?.name

              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {booking.customer_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {serviceName ?? 'Palvelu'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 tabular-nums">
                    {formatDateTimeHelsinki(booking.starts_at)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Tilastokortti-komponentti
function StatCard({
  label,
  value,
  linkHref,
  linkLabel,
}: {
  label: string
  value: number
  linkHref: string
  linkLabel: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <Link
        href={linkHref}
        className="text-xs text-pink-500 hover:text-violet-500 transition-colors mt-2 inline-block"
      >
        {linkLabel} →
      </Link>
    </div>
  )
}
