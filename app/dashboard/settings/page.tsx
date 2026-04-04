import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BusinessSettingsForm from '@/components/dashboard/BusinessSettingsForm'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, city, cancellation_hours, theme')
    .eq('user_id', user.id)
    .single()

  if (!business) return <p className="text-gray-500">Yritystietoja ei löydy.</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Asetukset</h1>
        <p className="text-gray-500 mt-1">Muokkaa salonkisi tietoja.</p>
      </div>

      <BusinessSettingsForm business={business} />
    </div>
  )
}
