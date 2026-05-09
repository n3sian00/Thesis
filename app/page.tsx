import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import BenefitCards from '@/components/landing/BenefitCards'
import HowItWorks from '@/components/landing/HowItWorks'
import CTABanner from '@/components/landing/CTABanner'
import Footer from '@/components/landing/Footer'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="bg-cream text-ink">
      <Navbar />
      <main>
        <Hero />
        <BenefitCards />
        <HowItWorks />
        <CTABanner />
      </main>
      <Footer />
    </div>
  )
}
