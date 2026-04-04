import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/dashboard/SidebarNav'

// Hallintapaneelin pohja — tarkistaa kirjautumisen ja hakee yritystiedot
// Middleware hoitaa uudelleenohjauksen, mutta tarkistetaan varmuuden vuoksi myös täällä
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Haetaan yrityksen nimi ja slug sivupalkkia varten
  const { data: business } = await supabase
    .from('businesses')
    .select('name, slug')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarNav business={business} />

      {/* Pääsisältöalue */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
