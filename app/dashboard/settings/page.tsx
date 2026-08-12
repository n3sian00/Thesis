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

  if (!business) return <p className="text-mocha">Yritystietoja ei löydy.</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-chocolate">Asetukset</h1>
        <p className="text-mocha mt-1">Muokkaa salonkisi tietoja.</p>
      </div>

      <BusinessSettingsForm business={business} />
    </div>
  )
}
