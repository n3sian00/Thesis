import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddServiceForm from '@/components/dashboard/AddServiceForm'
import ServiceRow from '@/components/dashboard/ServiceRow'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

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
