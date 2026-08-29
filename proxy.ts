import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  // 1) next-intl:n locale-reititys ajetaan ENSIN. Se voi:
  //    - rewritetä pyynnön (liittää sisäisen locale-headerin downstreamille
  //      i18n/request.ts:tä varten) ilman että selaimessa näkyvä URL muuttuu, TAI
  //    - redirectata (esim. jos NEXT_LOCALE-eväste/Accept-Language viittaa eri
  //      kieleen kuin URL, tai jos 'as-needed'-tilassa oletuskielelle on
  //      turha etuliite).
  //    Käytetään TÄTÄ response-objektia pohjana koko loppulogiikassa, jotta
  //    next-intl:n asettama locale-eväste ja mahdollinen rewrite säilyvät
  //    lopullisessa vastauksessa — emme koskaan korvaa sitä uudella
  //    NextResponse.next()-kutsulla, vaan kirjoitamme siihen.
  const response = handleI18nRouting(request)

  // 2) Supabase-sessio päivitetään SAMAAN response-objektiin (ei uuteen),
  //    jotta sekä locale-tila että auth-sessio kulkevat asiakkaalle samassa
  //    vastauksessa. getAll/setAll-kaava on ennallaan — ainoa muutos on että
  //    setAll kirjoittaa nyt next-intl:n response-objektiin sen sijaan että
  //    loisi uuden.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Tarkistetaan kirjautuminen getUser():lla (ei getSession() — se ei ole luotettava)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 3) Locale selvitetään pyynnön polusta itse (yksinkertaisempaa ja
  //    luotettavampaa kuin lukea next-intl:n sisäistä rewrite-tilaa), jotta
  //    auth-uudelleenohjausten kohde-URL:t voidaan rakentaa oikealla
  //    locale-etuliitteellä (esim. kirjautumaton /en/dashboard → /en/login).
  const { pathname } = request.nextUrl
  const localeSegment = routing.locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
  const locale = localeSegment ?? routing.defaultLocale
  const pathWithoutLocale = localeSegment
    ? pathname.slice(`/${localeSegment}`.length) || '/'
    : pathname

  function localizedUrl(path: string) {
    const prefixed = locale === routing.defaultLocale ? path : `/${locale}${path}`
    return new URL(prefixed, request.url)
  }

  // Suojatut reitit: /dashboard/* vaatii kirjautumisen
  if (pathWithoutLocale.startsWith('/dashboard') && !user) {
    const loginUrl = localizedUrl('/login')
    loginUrl.searchParams.set('redirect', pathname) // talletetaan alkuperäinen reitti
    return NextResponse.redirect(loginUrl)
  }

  // Kirjautunut käyttäjä ohjataan pois kirjautumis-/rekisteröintisivuilta
  if ((pathWithoutLocale === '/login' || pathWithoutLocale === '/register') && user) {
    return NextResponse.redirect(localizedUrl('/dashboard'))
  }

  return response
}

export const config = {
  matcher: [
    // Ajetaan kaikilla reiteillä paitsi API (pysyy lokalisoimattomana — next-intl
    // ei saa rewritetä/redirectata API-kutsuja), Next.js:n sisäiset, staattiset ja kuvat
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
