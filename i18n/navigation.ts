import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Locale-tietoiset navigointiapurit — käytä näitä next/link ja next/navigation
// sijaan kaikkialla sovelluksen sisäisessä navigoinnissa
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
