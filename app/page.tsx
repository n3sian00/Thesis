import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-violet-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">

        {/* Logo / otsikko */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
            KauneusAI
          </h1>
          <p className="text-gray-500 mt-3 text-lg leading-relaxed">
            Älykäs ajanvaraus kauneusalan yrittäjille.<br />
            Asiakkaasi varaavat ajan chatbotin kautta — sinä hallitset kaiken yhdestä paikasta.
          </p>
        </div>

        {/* CTA-napit */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 text-sm font-medium text-white rounded-xl
                       bg-gradient-to-r from-pink-500 to-violet-500
                       hover:from-pink-600 hover:to-violet-600
                       focus:outline-none focus:ring-2 focus:ring-pink-300
                       transition-all shadow-sm"
          >
            Kirjaudu sisään
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 text-sm font-medium text-gray-700 rounded-xl
                       bg-white border border-gray-200
                       hover:bg-gray-50 hover:border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-pink-200
                       transition-all shadow-sm"
          >
            Luo tili ilmaiseksi
          </Link>
        </div>

        {/* Ominaisuudet */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { title: 'AI-chatbot', desc: 'Asiakkaasi varaavat ajan luonnollisella kielellä, kellon ympäri.' },
            { title: 'Kalenteri', desc: 'Hallitse aikaikkunoita ja tarkastele varauksia yhdessä näkymässä.' },
            { title: 'Sähköpostit', desc: 'Automaattiset vahvistukset, muistutukset ja peruutusilmoitukset.' },
          ].map((f) => (
            <div key={f.title} className="bg-white/70 rounded-xl p-4 border border-white/80 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-1">{f.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
