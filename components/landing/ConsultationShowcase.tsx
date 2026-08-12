import BreathingOrb from '../chat/BreathingOrb'

const VAKUUTUKSET = [
  'Ymmärtää suomen puhekieltä ja alan sanastoa',
  'Kysyy oikeat kysymykset ja ehdottaa sopivaa palvelua',
  'Jaa linkkisi Instagramissa, WhatsAppissa tai verkkosivullasi',
]

const PIKAVASTAUKSET = [
  'Ti klo 14 sopii',
  'Näytä muita aikoja',
  'Mitä hinta sisältää?',
]

export default function ConsultationShowcase() {
  return (
    <section className="py-24 md:py-32 px-6 bg-transparent">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">

        {/* --- Vasen: teksti --- */}
        <div>
          <div className="inline-flex items-center px-4 py-1.5 mb-6 rounded-full border border-rose-deep/40 bg-baby/30 text-rose-deep text-xs font-medium tracking-widest uppercase">
            Konsultaatio
          </div>

          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-chocolate leading-[1.15] tracking-tight mb-5">
            Keskustelu, joka päättyy varaukseen
          </h2>

          <p className="text-mocha text-lg leading-relaxed max-w-md mb-8">
            Veloure-avustaja käy asiakkaasi kanssa saman keskustelun kuin sinä
            tekisit itse — ja vie sen aina konkreettiseen ajanvaraukseen asti.
          </p>

          <ul className="space-y-4">
            {VAKUUTUKSET.map((teksti) => (
              <li key={teksti} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-rose-deep shrink-0" aria-hidden />
                <span className="text-chocolate">{teksti}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* --- Oikea: mallikeskustelu (staattinen, ei toiminnallinen) --- */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white rounded-2xl border border-card-border shadow-xl shadow-rose/10 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-card-border">
            <BreathingOrb className="w-9 h-9 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif font-semibold text-chocolate leading-tight truncate">
                Veloure-avustaja
              </p>
              <p className="text-xs text-mocha mt-0.5">Vastaa yleensä sekunneissa</p>
            </div>
          </div>

          {/* Viestit */}
          <div className="px-5 py-5 space-y-3">
            <div className="bg-cream text-chocolate rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed max-w-[85%]">
              Hei! Kerro lyhyesti mitä toivoisit, niin katsotaan{' '}
              <em className="italic font-serif text-rose-deep">sopiva aika</em>.
            </div>

            <div className="bg-baby text-chocolate rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed max-w-[85%] ml-auto">
              Haluaisin geelilakkaukset ensi viikolle.
            </div>

            <div className="bg-cream text-chocolate rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed max-w-[85%]">
              Selvä. Ehdotan{' '}
              <em className="italic font-serif text-rose-deep">geelilakkaus, 90 min, 75 €</em>.
              Vapaat ajat: ti klo 14 tai ke klo 10.
            </div>

            {/* Kirjoitusindikaattori */}
            <div className="flex items-center gap-1.5 px-1" aria-hidden>
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-rose-deep rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>

            {/* Pikavastaukset */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PIKAVASTAUKSET.map((teksti) => (
                <div
                  key={teksti}
                  className="text-xs px-3 py-1.5 rounded-full border border-rose/40 text-rose-deep bg-baby/20"
                >
                  {teksti}
                </div>
              ))}
            </div>
          </div>

          {/* Syötealue (vain ulkoasu) */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-card-border">
            <div className="flex-1 px-3 py-2 text-sm rounded-xl border border-card-border text-mocha/60 bg-white">
              Kirjoita viesti…
            </div>
            <div
              className="flex-shrink-0 p-2.5 rounded-xl bg-chocolate text-warm-white"
              aria-hidden
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
