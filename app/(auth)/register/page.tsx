'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'

export default function RegisterPage() {
  const [virhe, toiminto, lataa] = useActionState(registerAction, null)

  return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / otsikko */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-chocolate">
            Veloure
          </h1>
          <p className="text-mocha mt-2 text-sm">Aloita ilmainen kokeilu</p>
        </div>

        {/* Lomakekortti */}
        <div className="bg-white rounded-2xl border border-card-border shadow-xl shadow-rose/20 p-8">
          <h2 className="font-serif text-xl font-semibold text-chocolate mb-6">
            Luo tili
          </h2>

          <form action={toiminto} className="space-y-5">

            {/* Salongin nimi */}
            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-chocolate mb-1"
              >
                Salongin nimi
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                autoComplete="organization"
                required
                placeholder="esim. Studio Lumière"
                className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent
                           transition-shadow"
              />
              <p className="text-xs text-mocha/70 mt-1">
                Nimestä luodaan automaattisesti URL-osoitteesi, esim.{' '}
                <span className="text-rose-deep">veloure.fi/studio-lumiere</span>
              </p>
            </div>

            {/* Sähköposti */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-chocolate mb-1"
              >
                Sähköposti
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="sinä@esimerkki.fi"
                className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent
                           transition-shadow"
              />
            </div>

            {/* Salasana */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-chocolate mb-1"
              >
                Salasana
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-card-border text-chocolate placeholder-mocha/50
                           focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent
                           transition-shadow"
              />
              <p className="text-xs text-mocha/70 mt-1">Vähintään 8 merkkiä</p>
            </div>

            {/* Virheilmoitus */}
            {virhe && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
                {virhe}
              </p>
            )}

            {/* Luo tili -nappi */}
            <button
              type="submit"
              disabled={lataa}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-warm-white
                         bg-chocolate hover:bg-chocolate/85
                         focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all"
            >
              {lataa ? 'Luodaan tiliä...' : 'Luo tili'}
            </button>
          </form>

          {/* Kirjautumislinkki */}
          <p className="text-center text-sm text-mocha mt-6">
            Onko sinulla jo tili?{' '}
            <Link
              href="/login"
              className="text-rose-deep hover:text-chocolate font-medium transition-colors"
            >
              Kirjaudu sisään
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
