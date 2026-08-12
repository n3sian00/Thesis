import Link from 'next/link'

export default function Footer() {
  return (
    <footer id="yhteystiedot" className="py-10 px-6 bg-transparent">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-mocha">
        <span className="font-serif text-base font-semibold text-chocolate">Veloure</span>

        <p>© 2026 Veloure. Kaikki oikeudet pidätetään.</p>

        <nav className="flex items-center gap-6">
          <Link href="/login" className="hover:text-chocolate transition-colors">
            Kirjaudu
          </Link>
          <Link href="/register" className="hover:text-chocolate transition-colors">
            Rekisteröidy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
