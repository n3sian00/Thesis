import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default async function Navbar() {
  const t = await getTranslations('Navbar')

  return (
    <header className="sticky top-0 z-50 bg-warm-white/90 backdrop-blur-sm border-b border-card-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-xl font-semibold text-chocolate tracking-wide shrink-0"
        >
          Veloure
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#ominaisuudet"
            className="text-sm text-mocha hover:text-chocolate transition-colors"
          >
            {t('features')}
          </a>
          <a
            href="#hinnoittelu"
            className="text-sm text-mocha hover:text-chocolate transition-colors"
          >
            {t('pricing')}
          </a>
          <a
            href="#yhteystiedot"
            className="text-sm text-mocha hover:text-chocolate transition-colors"
          >
            {t('contact')}
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-medium text-warm-white bg-chocolate rounded-full hover:bg-chocolate/85 transition-colors whitespace-nowrap"
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </header>
  )
}
