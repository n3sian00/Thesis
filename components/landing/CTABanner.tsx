import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function CTABanner() {
  const t = await getTranslations('CTABanner')

  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl bg-chocolate px-10 py-16 md:py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-warm-white mb-4">
            {t('title')}
          </h2>
          <p className="text-warm-white/60 text-lg mb-10 max-w-md mx-auto">
            {t('subtitle')}
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-3.5 text-sm font-medium text-chocolate bg-warm-white rounded-full hover:bg-baby transition-colors"
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </section>
  )
}
