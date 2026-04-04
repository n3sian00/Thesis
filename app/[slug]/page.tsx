import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ChatWidget from '@/components/chat/ChatWidget'

// Next.js 16: params on Promise
export default async function BusinessChatPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createSupabaseServerClient()

  // Haetaan yritys slugin perusteella — julkinen haku (public SELECT policy)
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, theme')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // Haetaan aktiiviset palvelut chatbotia varten
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-violet-100 flex items-center justify-center p-4">
      <ChatWidget
        business={{
          id: business.id,
          name: business.name,
          slug: business.slug,
          theme: business.theme,
        }}
        services={(services ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          duration_minutes: s.duration_minutes,
          price: Number(s.price),
        }))}
      />
    </main>
  )
}
