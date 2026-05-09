import Link from 'next/link'

export default function Footer() {
  return (
    <footer id="yhteystiedot" className="py-10 px-6 border-t border-card-border">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dusk">
        <span className="font-serif text-base font-semibold text-ink">Veloure</span>

        <p>© 2026 Veloure. Kaikki oikeudet pidätetään.</p>

        <nav className="flex items-center gap-6">
          <Link href="/login" className="hover:text-ink transition-colors">
            Kirjaudu
          </Link>
          <Link href="/register" className="hover:text-ink transition-colors">
            Rekisteröidy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
