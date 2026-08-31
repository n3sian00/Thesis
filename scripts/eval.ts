/**
 * scripts/eval.ts
 *
 * Mittaa kuinka usein malli valitsee oikean palvelun ja kuinka usein se
 * laukaisee varauksen silloin kun ei pitäisi.
 *
 * Aja projektin juuresta:
 *   npx tsx --env-file=.env.local scripts/eval.ts
 *
 * Skripti ei koske tietokantaan. Se tuo buildSystemPrompt-funktion suoraan
 * lib/claude.ts:stä ja syöttää sille kiinteän testiyrityksen. Ainoa ulkoinen
 * kutsu menee Anthropicille.
 */

import { writeFileSync } from 'node:fs'
import { anthropic, CLAUDE_MODEL, buildSystemPrompt } from '../lib/claude'

// ─────────────────────────────────────────────────────────────────────────────
// Asetukset
// ─────────────────────────────────────────────────────────────────────────────

// Montako kertaa jokainen skenaario ajetaan. Malli ei ole deterministinen,
// joten yksi ajo ei kerro mitään. 3 on minimi, 5 antaa vakaamman luvun.
const AJOKERRAT = 3

// Tauko kutsujen välissä (ms). Estää 429-virheet.
const TAUKO_MS = 400

// Rajaa ajettavat skenaariot id-listalla savuajoa varten, esim. ['A1', 'B1'].
// Tyhjä lista tarkoittaa "aja kaikki skenaariot".
const VAIN_SKENAARIOT: string[] = []

// Käytetäänkö palvelukategorioita. Kun tämä on true, buildSystemPrompt
// ryhmittelee palvelut ja lisää promptiin kategoriaohjeen. Aja mittaus
// molemmilla arvoilla, niin näet vaikuttaako ryhmittely tarkkuuteen.
const KATEGORIAT_KAYTOSSA = false

// Tiedostonimeen liitetään KATEGORIAT_KAYTOSSA-lipun arvo, jotta litteä ajo ja
// kategoria-ajo eivät ylikirjoita toisiaan.
const TULOSTIEDOSTO = `scripts/eval-results-kategoriat-${KATEGORIAT_KAYTOSSA}.json`

// ─────────────────────────────────────────────────────────────────────────────
// Testiyritys
// ─────────────────────────────────────────────────────────────────────────────

// HUOM: palveluvalinnan säännöt menevät general_notes-kenttään, koska se on
// ainoa paikka jossa ne voivat olla. Jos muutat tätä tekstiä, mittaustulos
// muuttuu — se on prompt, ei kommentti.
const YRITYS = {
  name: 'Atelier Blonde',
  city: 'Oulu',
  cancellation_hours: 24,
  general_notes: [
    'Erikoistuminen: blondit, raidat, balayage ja vaativat värimuutokset. Teemme myös ruskeita sävyjä, tyvivärejä ja koko hiusten värjäyksiä.',
    'Blondipalveluihin sisältyy sävytys, suojaava tehohoito, pesu ja föönaus. Hiustenleikkaus ei sisälly hintoihin.',
    'Palveluvalinnan säännöt:',
    '- Koko pään raidat: asiakas haluaa vaaleutta kaikkialle, myös niskaan, tai tyvikasvua on noin 5 cm tai enemmän.',
    '- Osapään raidat: nykyinen blondi on muuten hyvä ja vaalennusta halutaan vain näkyville alueille.',
    '- Balayage: asiakas haluaa pehmeän tyven ja luonnollisen uloskasvun.',
    '- Tyvivaalennus: hiukset on aiemmin vaalennettu kokonaan tyvestä asti ja tyvikasvua on enintään noin 2,5 cm.',
    '- Sävytys muuttaa blondin sävyä, mutta ei vaalenna tummaa tyvikasvua.',
    '- Tyviväri ei tarkoita tyvivaalennusta. Sitä käytetään harmaiden peittoon tai ruskean värin ylläpitoon.',
    '- Värinkorjaus tarvitaan kotivärin, mustan tai punaisen värin, väriraitojen tai epätasaisen vaalennuspohjan korjaamiseen.',
    '- Värinkorjausta ei voi varata suoraan. Ohjaa asiakas ensin värikonsultaatioon.',
    '- Jos värihistoria tai tavoite jää epäselväksi, älä käynnistä varausta ennen tarkennusta.',
  ].join('\n'),
}

type Palvelu = {
  id: string
  name: string
  description: string
  category: string | null
  duration_minutes: number
  price: number
}

const PALVELUT_POHJA: Array<Palvelu & { kategoria: string }> = [
  {
    id: 'srv-001',
    name: 'Värikonsultaatio',
    description:
      'Lähtötilanteen, värihistorian ja tavoitteen arviointi ennen suurta värimuutosta tai värinkorjausta.',
    category: null,
    kategoria: 'Muut',
    duration_minutes: 20,
    price: 25,
  },
  {
    id: 'srv-002',
    name: 'Koko pään raidat',
    description:
      'Raidat koko päähän, myös takaosaan ja niskaan. Sopii suureen vaalennukseen, pitkään tyvikasvuun tai ensimmäiseen laajaan blondikäsittelyyn.',
    category: null,
    kategoria: 'Vaalennukset',
    duration_minutes: 240,
    price: 249,
  },
  {
    id: 'srv-003',
    name: 'Osapään raidat',
    description:
      'Raidat päälliosaan, jakauksen alueelle ja kasvojen ympärille. Sopii olemassa olevan blondin ylläpitoon, kun pituudet ja niska eivät tarvitse käsittelyä.',
    category: null,
    kategoria: 'Vaalennukset',
    duration_minutes: 180,
    price: 189,
  },
  {
    id: 'srv-004',
    name: 'Balayage',
    description:
      'Vapaalla kädellä tehtävä pehmeä vaalennus. Luonnollinen tyvi ja huomaamattomampi uloskasvu.',
    category: null,
    kategoria: 'Vaalennukset',
    duration_minutes: 240,
    price: 259,
  },
  {
    id: 'srv-005',
    name: 'Tyvivaalennus ja sävytys',
    description:
      'Kokonaan vaalennetun blondin tyvikasvun vaalentaminen. Sopii enintään noin 2,5 cm:n tyvikasvuun.',
    category: null,
    kategoria: 'Vaalennukset',
    duration_minutes: 180,
    price: 189,
  },
  {
    id: 'srv-006',
    name: 'Sävytys – Blonde Refresh',
    description:
      'Olemassa olevan blondin sävyn kirkastaminen tai muuttaminen esimerkiksi viileämmäksi. Ei vaalenna luonnollista tyveä.',
    category: null,
    kategoria: 'Sävytykset',
    duration_minutes: 90,
    price: 109,
  },
  {
    id: 'srv-007',
    name: 'Tyviväri',
    description:
      'Tyvikasvun värjääminen ilman vaalennusta, esimerkiksi harmaiden peittoon tai ruskean sävyn ylläpitoon.',
    category: null,
    kategoria: 'Tummat värit',
    duration_minutes: 120,
    price: 129,
  },
  {
    id: 'srv-008',
    name: 'Koko hiusten värjäys',
    description:
      'Hiusten värjääminen yhteen tasaiseen sävyyn. Sopii saman tummuusasteen ylläpitoon tai tummemmaksi värjäämiseen.',
    category: null,
    kategoria: 'Tummat värit',
    duration_minutes: 180,
    price: 179,
  },
  {
    id: 'srv-009',
    name: 'Moniulotteinen tumma väri',
    description:
      'Ruskean tai tumman sävyn rakentaminen useammalla sävyllä, esimerkiksi lowlighteilla ja kiiltosävytyksellä.',
    category: null,
    kategoria: 'Tummat värit',
    duration_minutes: 210,
    price: 219,
  },
  {
    id: 'srv-010',
    name: 'Värinkorjaus',
    description:
      'Epätasaisen tai epäonnistuneen värin korjaaminen sekä suuret muutokset värjätystä tummasta vaaleaan. Edellyttää ensin värikonsultaation. Hinta alkaen 329 €.',
    category: null,
    kategoria: 'Muut',
    duration_minutes: 300,
    price: 329,
  },
]

const PALVELUT: Palvelu[] = PALVELUT_POHJA.map(({ kategoria, ...p }) => ({
  ...p,
  category: KATEGORIAT_KAYTOSSA ? kategoria : null,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Skenaariot
// ─────────────────────────────────────────────────────────────────────────────

type Skenaario = {
  id: string
  nimi: string
  /** Asiakkaan repliikit järjestyksessä. Kiinteät — eivät riipu mallin vastauksesta. */
  viestit: string[]
  /** Odotettu service_id, tai null jos varausta EI saa käynnistyä. */
  odotettu: string | null
  huom?: string
}

const SKENAARIOT: Skenaario[] = [
  // ── Tavalliset varaustilanteet ────────────────────────────────────────────
  {
    id: 'A1',
    nimi: 'koko pää + niska, pitkä tyvi',
    viestit: [
      'moikka haluisin koko pään vaaleemmaks ja raitoja myös niskaan',
      'omaa tyveä on joku 5 cm ja ens viikon pe kävis',
    ],
    odotettu: 'srv-002',
  },
  {
    id: 'A2',
    nimi: 'vain päälliosa ja kasvojen ympärys',
    viestit: [
      'heii kaipaisin vaan päälliosaan ja naaman ympärille lisää vaaleeta, pituus on muuten hyvä. oisko torstaina aikaa',
    ],
    odotettu: 'srv-003',
  },
  {
    id: 'A3',
    nimi: 'pehmeä uloskasvu',
    viestit: [
      'haluisin pehmeen balayagen niin ettei tyvikasvu näkyis heti, pääsiskö ens kuun 12 päivä',
    ],
    odotettu: 'srv-004',
  },
  {
    id: 'A4',
    nimi: 'kokonaan vaalennettu, 2 cm tyveä',
    viestit: [
      'oon kokonaan vaalennettu blondi ja omaa tummaa tyveä on noin 2 cm, edellisestä kerrasta 7 viikkoo. saisko tyven taas vaaleeks',
    ],
    odotettu: 'srv-005',
  },
  {
    id: 'A5',
    nimi: 'harmaiden peitto',
    viestit: [
      'tarvisin harmaiden peiton tyveen, sama keskiruskee ku pituudessa. onks maanantaina aikaa',
    ],
    odotettu: 'srv-007',
  },

  // ── Varausta ei saa syntyä ────────────────────────────────────────────────
  {
    id: 'B1',
    nimi: 'pelkkä hintatiedustelu',
    viestit: ['paljon koko pään raidat maksaa pitkään tukkaan'],
    odotettu: null,
    huom: 'Palvelu on tunnistettavissa (srv-002), mutta asiakas kysyy vain hintaa.',
  },
  {
    id: 'B2',
    nimi: 'ei tiedä mitä haluaa',
    viestit: ['haluisin olla blondimpi mut en yhtään tiiä pitäskö ottaa raidat vai balayage'],
    odotettu: null,
    huom: 'Pitäisi kysyä nykyisestä väristä, tyvikasvusta ja tavoitteesta.',
  },
  {
    id: 'B3',
    nimi: 'kotimusta → kylmä vaalea',
    viestit: [
      'oon värjänny kotona mustalla pari vuotta mut haluisin nyt tosi kylmän vaaleen, onnistuuks se yhellä kerralla',
    ],
    odotettu: null,
    huom: 'Värinkorjausta ei voi varata suoraan. Pitäisi ohjata srv-001-konsultaatioon.',
  },

  // ── Vaikeat sekoitettavat ─────────────────────────────────────────────────
  {
    id: 'C1',
    nimi: 'asiakas pyytää sävytystä, tarvitsee raidat',
    viestit: [
      'voisko varaa sävytyksen ku mun tyvi on ihan tumma',
      'pituus on hyvä, haluun vaan jakauksen ja etuosan vaaleeks. tyveä on joku 4 cm ja perjantai kävis',
    ],
    odotettu: 'srv-003',
    huom: 'Ei srv-006: sävytys ei vaalenna luonnollista tyveä.',
  },
  {
    id: 'C2',
    nimi: 'asiakas sanoo "tyviväri", tarkoittaa tyvivaalennusta',
    viestit: [
      'heii tarvisin tyvivärin',
      'oon siis kokonaan platinablondi ja omaa tummaa tyveä on 2 cm, edellisestä vaalennuksesta noin 7 viikkoo',
    ],
    odotettu: 'srv-005',
    huom: 'Ei srv-007, vaikka asiakas käyttää sanaa tyviväri.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Varausmerkinnän poiminta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TIUKKA: tuotannon varausmerkinnän regex. Kopioitu merkki merkiltä
 * components/chat/ChatWidget.tsx:n BOOKING_TRIGGER_REGEX-vakiosta.
 * Nämä kaksi vakiota on pidettävä synkronissa — jos toista muutetaan,
 * on toinenkin päivitettävä, muuten eval mittaa eri asiaa kuin tuotanto.
 */
const TIUKKA = /\[VARAUS:(\{[^}]+\})\]/

/** SALLIVA: mikä tahansa VARAUS-merkintä missä tahansa kohtaa vastausta. */
const SALLIVA = /\[VARAUS\s*:?\s*(\{[\s\S]*?\})\s*\]?/

type Poiminta = {
  serviceId: string | null
  /**
   * 'oikea'     = tuotannon regex (TIUKKA) olisi poiminut merkinnän.
   * 'poikkeava' = tuotanto ei olisi poiminut, mutta salliva haku löysi.
   * 'rikki'     = VARAUS mainittu mutta id ei irtoa.
   */
  muoto: 'oikea' | 'poikkeava' | 'rikki'
}

function poimiVaraus(teksti: string): Poiminta | null {
  const tiukka = teksti.match(TIUKKA)
  if (tiukka) {
    try {
      const o = JSON.parse(tiukka[1])
      if (typeof o.service_id === 'string') {
        return { serviceId: o.service_id, muoto: 'oikea' }
      }
    } catch {
      // JSON ei jäsenny — käsitellään alla sallivalla
    }
  }

  const salliva = teksti.match(SALLIVA)
  if (salliva) {
    try {
      const o = JSON.parse(salliva[1])
      if (typeof o.service_id === 'string') {
        return { serviceId: o.service_id, muoto: 'poikkeava' }
      }
    } catch {
      // jatketaan
    }
    const idOsuma = salliva[1].match(/"service_id"\s*:\s*"([^"]+)"/)
    if (idOsuma) return { serviceId: idOsuma[1], muoto: 'poikkeava' }
  }

  if (teksti.includes('VARAUS')) {
    return { serviceId: null, muoto: 'rikki' }
  }

  return null
}

/** Poistaa merkinnän, jotta voidaan tarkistaa mitä asiakas näkisi. */
function nakyvaTeksti(teksti: string): string {
  return teksti.replace(SALLIVA, '').trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Ajo
// ─────────────────────────────────────────────────────────────────────────────

type Lopputulos = 'oikein' | 'vaara_palvelu' | 'puuttuva_varaus' | 'liian_herkka'

type Ajo = {
  skenaario: string
  ajokerta: number
  lopputulos: Lopputulos
  saatuId: string | null
  muoto: Poiminta['muoto'] | null
  /** Monennellako vuorolla merkintä tuli. null jos ei tullut. */
  vuoro: number | null
  /** Näkyikö sisäinen palvelutunnus asiakkaalle (ohjeistuksen kohta 5). */
  idVuoto: boolean
  keskustelu: Array<{ role: string; content: string }>
}

const odota = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function kysyMallilta(
  system: string,
  viestit: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const vastaus = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: viestit,
  })
  return vastaus.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

async function ajaSkenaario(
  skenaario: Skenaario,
  system: string,
  ajokerta: number
): Promise<Ajo> {
  const keskustelu: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let poiminta: Poiminta | null = null
  let vuoro: number | null = null
  let idVuoto = false

  for (let i = 0; i < skenaario.viestit.length; i++) {
    keskustelu.push({ role: 'user', content: skenaario.viestit[i] })
    const vastaus = await kysyMallilta(system, keskustelu)
    keskustelu.push({ role: 'assistant', content: vastaus })

    if (nakyvaTeksti(vastaus).includes('srv-')) idVuoto = true

    const p = poimiVaraus(vastaus)
    if (p) {
      // Tuotannossa ensimmäinen merkintä avaa ajanvalinnan ja keskustelu
      // päättyy siihen. Tehdään sama täällä.
      poiminta = p
      vuoro = i + 1
      break
    }

    await odota(TAUKO_MS)
  }

  let lopputulos: Lopputulos
  if (skenaario.odotettu === null) {
    lopputulos = poiminta ? 'liian_herkka' : 'oikein'
  } else if (!poiminta) {
    lopputulos = 'puuttuva_varaus'
  } else if (poiminta.serviceId === skenaario.odotettu) {
    lopputulos = 'oikein'
  } else {
    lopputulos = 'vaara_palvelu'
  }

  return {
    skenaario: skenaario.id,
    ajokerta,
    lopputulos,
    saatuId: poiminta?.serviceId ?? null,
    muoto: poiminta?.muoto ?? null,
    vuoro,
    idVuoto,
    keskustelu,
  }
}

async function main() {
  const system = buildSystemPrompt(YRITYS, PALVELUT, 'fi')

  const ajettavat =
    VAIN_SKENAARIOT.length > 0
      ? SKENAARIOT.filter((s) => VAIN_SKENAARIOT.includes(s.id))
      : SKENAARIOT

  console.log('─'.repeat(70))
  console.log(`Malli:        ${CLAUDE_MODEL}`)
  console.log(`Skenaarioita: ${ajettavat.length}`)
  console.log(`Ajokertoja:   ${AJOKERRAT}`)
  console.log(`Kategoriat:   ${KATEGORIAT_KAYTOSSA ? 'käytössä' : 'ei käytössä'}`)
  console.log(`Promptin koko: ${system.length} merkkiä`)
  console.log('─'.repeat(70))
  console.log()

  const ajot: Ajo[] = []

  for (const skenaario of ajettavat) {
    const rivit: string[] = []
    for (let n = 1; n <= AJOKERRAT; n++) {
      const ajo = await ajaSkenaario(skenaario, system, n)
      ajot.push(ajo)
      rivit.push(ajo.lopputulos === 'oikein' ? '✓' : '✗')
      await odota(TAUKO_MS)
    }

    const omat = ajot.filter((a) => a.skenaario === skenaario.id)
    const osumat = omat.filter((a) => a.lopputulos === 'oikein').length
    const odotettuTeksti = skenaario.odotettu ?? 'ei varausta'

    console.log(
      `${skenaario.id}  ${rivit.join(' ')}  ${osumat}/${AJOKERRAT}  ` +
        `odotettu: ${odotettuTeksti}  — ${skenaario.nimi}`
    )

    // Näytä mitä tuli virheellisissä ajoissa
    const virheet = omat.filter((a) => a.lopputulos !== 'oikein')
    for (const v of virheet) {
      const saatu = v.saatuId ?? (v.muoto === 'rikki' ? 'merkintä rikki' : 'ei merkintää')
      console.log(`     └─ ${v.lopputulos}: ${saatu}`)
    }
  }

  // ── Yhteenveto ────────────────────────────────────────────────────────────
  const yhteensa = ajot.length
  const laske = (t: Lopputulos) => ajot.filter((a) => a.lopputulos === t).length
  const pros = (n: number) => `${((n / yhteensa) * 100).toFixed(1)} %`

  console.log()
  console.log('─'.repeat(70))
  console.log(`Ajoja yhteensä:        ${yhteensa}`)
  console.log(`Oikein:                ${laske('oikein')}  (${pros(laske('oikein'))})`)
  console.log(`Väärä palvelu:         ${laske('vaara_palvelu')}`)
  console.log(`Varaus jäi tekemättä:  ${laske('puuttuva_varaus')}`)
  console.log(`Laukesi turhaan:       ${laske('liian_herkka')}`)
  console.log('─'.repeat(70))

  // Muotovirheet — tämä on se luku jonka tool use poistaisi rakenteellisesti
  const merkinnalliset = ajot.filter((a) => a.muoto !== null)
  const poikkeavat = ajot.filter((a) => a.muoto === 'poikkeava' || a.muoto === 'rikki')
  console.log(`Merkintöjä yhteensä:   ${merkinnalliset.length}`)
  console.log(
    `Muodoltaan poikkeavia: ${poikkeavat.length}` +
      (merkinnalliset.length
        ? `  (${((poikkeavat.length / merkinnalliset.length) * 100).toFixed(1)} % merkinnöistä)`
        : '')
  )

  const vuodot = ajot.filter((a) => a.idVuoto).length
  console.log(`Palvelutunnus näkyi asiakkaalle: ${vuodot} ajossa`)
  console.log('─'.repeat(70))

  writeFileSync(
    TULOSTIEDOSTO,
    JSON.stringify(
      {
        ajettu: new Date().toISOString(),
        malli: CLAUDE_MODEL,
        kategoriatKaytossa: KATEGORIAT_KAYTOSSA,
        ajokerrat: AJOKERRAT,
        ajot,
      },
      null,
      2
    ),
    'utf8'
  )
  console.log(`Yksityiskohdat: ${TULOSTIEDOSTO}`)
}

main().catch((err) => {
  console.error('Eval kaatui:', err)
  process.exit(1)
})
