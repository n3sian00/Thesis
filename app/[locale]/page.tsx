import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import BenefitCards from '@/components/landing/BenefitCards'
import HowItWorks from '@/components/landing/HowItWorks'
import ConsultationShowcase from '@/components/landing/ConsultationShowcase'
import CTABanner from '@/components/landing/CTABanner'
import Footer from '@/components/landing/Footer'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect({ href: '/dashboard', locale: await getLocale() })

  return (
    <div
      className="text-chocolate"
      style={{
        background: 'linear-gradient(165deg, #F6D8DC 0%, #F3CFC9 40%, #F3C6A8 100%)',
      }}
    >
      <Navbar />
      <main>
        <Hero />
        <BenefitCards />
        <HowItWorks />
        <ConsultationShowcase />
        <CTABanner />
      </main>
      <Footer />
    </div>
  )
}
