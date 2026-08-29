'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

interface Props {
  // 'light': vaalealla taustalla (esim. Navbar). 'dark': tummalla taustalla (esim. ChatWidgetin header)
  variant?: 'light' | 'dark'
}

// Kielenvalitsin — säilyttää nykyisen polun, vaihtaa vain localen.
// Käytetään sekä landing pagen yläpalkissa että ChatWidgetin headerissa.
export default function LanguageSwitcher({ variant = 'light' }: Props) {
  const activeLocale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('LanguageSwitcher')

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 text-xs font-medium shrink-0 ${
        variant === 'dark' ? 'border-white/25' : 'border-card-border'
      }`}
    >
      {routing.locales.map((loc) => {
        const isActive = loc === activeLocale
        return (
          <Link
            key={loc}
            href={pathname}
            locale={loc}
            aria-current={isActive ? 'true' : undefined}
            className={`px-2.5 py-1 rounded-full uppercase transition-colors ${
              isActive
                ? variant === 'dark'
                  ? 'bg-white/20 text-warm-white'
                  : 'bg-chocolate text-warm-white'
                : variant === 'dark'
                  ? 'text-warm-white/70 hover:text-warm-white'
                  : 'text-mocha hover:text-chocolate'
            }`}
          >
            {loc}
          </Link>
        )
      })}
    </div>
  )
}
