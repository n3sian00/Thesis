const benefits = [
  {
    emoji: '🤖',
    title: 'Automatisoi asiakaskyselyt',
    description:
      'Vastaa yleisimpiin kysymyksiin ja ohjaa asiakas eteenpäin ilman jatkuvaa manuaalista viestittelyä.',
  },
  {
    emoji: '🎯',
    title: 'Ohjaa asiakas oikeaan palveluun',
    description:
      'Tekoäly kysyy oikeat kysymykset ja auttaa asiakasta valitsemaan sopivan palvelun ennen varausta.',
  },
  {
    emoji: '📱',
    title: 'Toimii ilman verkkosivuja',
    description:
      'Jaa oma linkkisi Instagramissa, viesteissä tai profiilissa. Asiakkaasi pääsevät varaamaan helposti.',
  },
  {
    emoji: '✅',
    title: 'Vähennä epäselviä varauksia',
    description:
      'Kerää tarvittavat tiedot ennen ajanvarausta ja varmista, että asiakas tietää mitä varaa.',
  },
  {
    emoji: '⏰',
    title: 'Säästä aikaa arjessa',
    description:
      'Anna palvelun hoitaa toistuvat kysymykset, jotta voit keskittyä asiakkaisiin ja kasvuun.',
  },
  {
    emoji: '💅',
    title: 'Rakennettu kauneusalalle',
    description:
      'Ei yleinen chatbot, vaan asiakasohjaus juuri kauneuspalveluille.',
  },
]

export default function BenefitCards() {
  return (
    <section id="ominaisuudet" className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-ink mb-4">
            Mitä Veloure tekee puolestasi
          </h2>
          <p className="text-dusk max-w-lg mx-auto">
            Kaikki mitä tarvitset sujuvaan asiakashallintaan — yhdessä paikassa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white rounded-2xl p-7 border border-card-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="text-3xl mb-4 block" role="img" aria-label={b.title}>
                {b.emoji}
              </span>
              <h3 className="font-serif text-lg font-semibold text-ink mb-2">
                {b.title}
              </h3>
              <p className="text-sm text-dusk leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
