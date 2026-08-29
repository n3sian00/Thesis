import { routing } from '@/i18n/routing'

// Sanat, jotka törmäisivät reitityksen kanssa [locale]-segmentin sisällä
// (esim. /dashboard, /en/dashboard) — slug ei saa olla mikään näistä.
const RESERVED_ROUTE_WORDS = ['dashboard', 'login', 'register', 'cancel', 'api']

// Kielikoodit lisätään automaattisesti routing.locales-listasta, joten uuden
// kielen lisääminen i18n/routing.ts:ään varaa sen sanan tähän ilman erillistä muutosta.
export const RESERVED_SLUGS: readonly string[] = [
  ...RESERVED_ROUTE_WORDS,
  ...routing.locales,
]

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug)
}
