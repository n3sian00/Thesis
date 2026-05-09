import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative py-28 md:py-36 px-6 text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-petal/30 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        <div className="inline-flex items-center px-4 py-1.5 mb-10 rounded-full border border-blush/40 bg-petal/30 text-blush text-xs font-medium tracking-widest uppercase">
          Suunniteltu kauneusalan yrittäjille
        </div>

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold text-ink leading-[1.1] tracking-tight mb-8">
          Älykäs asiakasohjaus.{' '}
          <br className="hidden sm:block" />
          <em className="not-italic text-blush">Ilman säätöä.</em>
        </h1>

        <p className="text-lg md:text-xl text-dusk leading-relaxed max-w-2xl mx-auto mb-12">
          Automatisoi asiakaskyselyt, ohjaa asiakkaat oikeisiin palveluihin ja
          tee ajanvarauksesta selkeää — ilman monimutkaisia järjestelmiä.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-medium text-cream bg-ink rounded-full hover:bg-ink/85 transition-colors shadow-sm"
          >
            Aloita ilmaiseksi
          </Link>
          <Link
            href="#miten-toimii"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-medium text-ink border border-ink/20 rounded-full hover:border-ink/40 hover:bg-ink/5 transition-colors"
          >
            Katso miten toimii
          </Link>
        </div>
      </div>
    </section>
  )
}
