import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Alustetaan response, jota päivitetään tarvittaessa
  let supabaseResponse = NextResponse.next({ request })

  // Luodaan Supabase-client proxylle
  // Tärkeää: setAll kirjoittaa päivitetyn session sekä requestiin että responseen
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Päivitetään ensin request-evästeet
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Luodaan uusi response päivitetyillä request-evästeillä
          supabaseResponse = NextResponse.next({ request })
          // Kirjoitetaan evästeet myös responseen selaimelle
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Tarkistetaan kirjautuminen getUser():lla (ei getSession() — se ei ole luotettava)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Suojatut reitit: /dashboard/* vaatii kirjautumisen
  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname) // talletetaan alkuperäinen reitti
    return NextResponse.redirect(loginUrl)
  }

  // Kirjautunut käyttäjä ohjataan pois kirjautumis-/rekisteröintisivuilta
  if ((pathname === '/login' || pathname === '/register') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Ajetaan kaikilla reiteillä paitsi Next.js:n sisäiset, staattiset ja kuvat
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
