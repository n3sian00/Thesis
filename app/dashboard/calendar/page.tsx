import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import CalendarView from '@/components/dashboard/CalendarView'

// Kalenteri-sivun Server Component — autentikoi käyttäjän ja välittää
// businessId CalendarView-komponentille, joka hoitaa kaiken interaktiivisuuden
export default async function CalendarPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Kalenteri</h1>
        <p className="text-gray-500 mt-1">
          Hallitse varattavissa olevia aikaikkunoita. Tauot hoidetaan lisäämällä
          erilliset ikkunat, esim. 09–12 ja 13–17.
        </p>
      </div>
      <CalendarView businessId={business.id} />
    </div>
  )
}
