import { defineRouting } from 'next-intl/routing'

// Keskitetty reititysasetus — tuotu sekä proxy.ts:ssä että i18n/navigation.ts:ssä
export const routing = defineRouting({
  locales: ['fi', 'en'],
  defaultLocale: 'fi',
  // Suomi (oletuskieli) ilman etuliitettä: /, /dashboard, /studio-lumiere
  // Englanti etuliitteellä: /en, /en/dashboard, /en/studio-lumiere
  localePrefix: 'as-needed',
})
