const steps = [
  {
    number: '01',
    title: 'Lisää palvelusi ja ohjeet kerran',
    description:
      'Syötä tarjoamasi palvelut, hinnat ja mahdolliset erityisohjeet. Tekoäly oppii ne heti.',
  },
  {
    number: '02',
    title: 'Jaa oma Veloure-linkkisi asiakkaillesi',
    description:
      'Kopioi linkkisi ja jaa se Instagramissa, WhatsAppissa tai verkkosivuillasi. Ei asennuksia.',
  },
  {
    number: '03',
    title: 'Tekoäly ohjaa, vastaa ja varaa puolestasi',
    description:
      'Asiakkaasi chataavat, saavat vastaukset ja tekevät varauksen — sinulle jää enemmän aikaa itse työhön.',
  },
]

export default function HowItWorks() {
  return (
    <section id="miten-toimii" className="py-24 md:py-32 px-6 bg-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-chocolate mb-4">
            Miten se toimii?
          </h2>
          <p className="text-mocha max-w-md mx-auto">
            Käyttöönotto vie minuutteja, ei päiviä.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center md:items-start text-center md:text-left"
            >
              <div className="w-14 h-14 rounded-full bg-baby border border-rose-deep/30 flex items-center justify-center mb-6 shrink-0">
                <span className="font-serif text-base font-semibold text-rose-deep">
                  {step.number}
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-chocolate mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-mocha leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
