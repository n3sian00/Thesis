import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { hasLocale } from 'next-intl'
import { redirect } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ChatWidget from '@/components/chat/ChatWidget'

// Next.js 16: params on Promise
export default async function BusinessChatPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  const supabase = await createSupabaseServerClient()

  // Haetaan yritys slugin perusteella — julkinen haku (public SELECT policy)
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, theme, city, cancellation_hours, general_notes, locale')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // Ensikertalaisen asiakkaan ohjaus yrityksen omalle kielelle: jos asiakas
  // saapuu etuliitteettömään osoitteeseen (oletuskieli 'fi') eikä hänellä ole
  // vielä tallennettua kielivalintaa (NEXT_LOCALE-eväste), ja yrityksen oma
  // kieli on jokin muu, ohjataan yrityksen kielen mukaiseen osoitteeseen.
  // Kun asiakas myöhemmin vaihtaa kieltä valitsimesta, eväste asettuu eikä
  // tätä ohjausta enää tehdä — valinta säilyy.
  if (locale === routing.defaultLocale && business.locale !== routing.defaultLocale) {
    const cookieStore = await cookies()
    if (!cookieStore.has('NEXT_LOCALE') && hasLocale(routing.locales, business.locale)) {
      redirect({ href: `/${slug}`, locale: business.locale })
    }
  }

  // Haetaan aktiiviset palvelut chatbotia varten
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price, category')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center p-4">
      <ChatWidget
        business={{
          id: business.id,
          name: business.name,
          slug: business.slug,
          theme: business.theme,
          city: business.city,
          cancellation_hours: business.cancellation_hours,
          general_notes: business.general_notes,
        }}
        services={(services ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          duration_minutes: s.duration_minutes,
          price: Number(s.price),
          category: s.category,
        }))}
      />
    </main>
  )
}
