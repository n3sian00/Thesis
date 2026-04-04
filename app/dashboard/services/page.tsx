import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddServiceForm from '@/components/dashboard/AddServiceForm'
import { deleteServiceAction, toggleServiceAction } from '@/app/actions/services'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

// Muotoilee minuutit luettavaan muotoon: 90 → "1 t 30 min"
function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} t ${m} min` : `${h} t`
}

// Muotoilee hinnan euroiksi
function formatPrice(price: number) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

export default async function ServicesPage() {
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

  if (!business) {
    return <p className="text-gray-500">Yritystietoja ei löydy.</p>
  }

  // Haetaan kaikki palvelut (myös ei-aktiiviset omistajalle)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  const aktiiviset = services?.filter((s) => s.active) ?? []
  const eiAktiiviset = services?.filter((s) => !s.active) ?? []

  return (
    <div className="space-y-8">

      {/* Otsikko */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Palvelut</h1>
        <p className="text-gray-500 mt-1">
          Hallitse tarjoamiasi palveluita — AI käyttää näitä asiakasohjauksessa.
        </p>
      </div>

      {/* Lisää palvelu -lomake */}
      <AddServiceForm />

      {/* Palvelulistaus */}
      {(!services || services.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">
            Ei vielä palveluita. Lisää ensimmäinen palvelu yllä olevalla lomakkeella.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Aktiiviset palvelut */}
          {aktiiviset.length > 0 && (
            <ServiceGroup
              otsikko="Aktiiviset palvelut"
              services={aktiiviset}
            />
          )}

          {/* Ei-aktiiviset palvelut */}
          {eiAktiiviset.length > 0 && (
            <ServiceGroup
              otsikko="Piilotetut palvelut"
              services={eiAktiiviset}
              dim
            />
          )}
        </div>
      )}
    </div>
  )
}

// Palveluryhmä-komponentti (aktiiviset / piilotetut)
function ServiceGroup({
  otsikko,
  services,
  dim = false,
}: {
  otsikko: string
  services: Service[]
  dim?: boolean
}) {
  return (
    <div>
      <h2 className={`text-sm font-medium mb-2 ${dim ? 'text-gray-400' : 'text-gray-600'}`}>
        {otsikko} ({services.length})
      </h2>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {services.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </div>
    </div>
  )
}

// Yksittäinen palvelurivi
function ServiceRow({ service }: { service: Service }) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-4 ${
        !service.active ? 'opacity-50' : ''
      }`}
    >
      {/* Palvelun tiedot */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{service.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDuration(service.duration_minutes)} &middot;{' '}
          {formatPrice(Number(service.price))}
        </p>
      </div>

      {/* Toimintopainikkeet */}
      <div className="flex items-center gap-2 ml-4">

        {/* Aktiivisuuden vaihto */}
        <form action={toggleServiceAction}>
          <input type="hidden" name="id" value={service.id} />
          <input type="hidden" name="active" value={String(service.active)} />
          <button
            type="submit"
            title={service.active ? 'Piilota palvelu' : 'Aktivoi palvelu'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              service.active
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {service.active ? 'Aktiivinen' : 'Piilotettu'}
          </button>
        </form>

        {/* Poisto */}
        <form
          action={deleteServiceAction}
          onSubmit={(e) => {
            if (!confirm(`Poistetaanko palvelu "${service.name}"?`)) {
              e.preventDefault()
            }
          }}
        >
          <input type="hidden" name="id" value={service.id} />
          <button
            type="submit"
            title="Poista palvelu"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
