import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-card-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-xl font-semibold text-ink tracking-wide"
        >
          Veloure
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#ominaisuudet"
            className="text-sm text-dusk hover:text-ink transition-colors"
          >
            Ominaisuudet
          </Link>
          <Link
            href="#hinnoittelu"
            className="text-sm text-dusk hover:text-ink transition-colors"
          >
            Hinnoittelu
          </Link>
          <Link
            href="#yhteystiedot"
            className="text-sm text-dusk hover:text-ink transition-colors"
          >
            Yhteystiedot
          </Link>
        </nav>

        <Link
          href="/register"
          className="px-5 py-2 text-sm font-medium text-cream bg-ink rounded-full hover:bg-ink/85 transition-colors"
        >
          Aloita nyt
        </Link>
      </div>
    </header>
  )
}
