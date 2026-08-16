import Anthropic from '@anthropic-ai/sdk'

// Käytetty malli — vaihda tarvittaessa
export const CLAUDE_MODEL = 'claude-sonnet-4-6'

// Singleton-client — alustetaan kerran, käytetään kaikissa Route Handlereissa
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Ympäristömuuttuja ANTHROPIC_API_KEY puuttuu.')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Rakentaa system promptin yrityksen palveluiden perusteella
// Käytetään /api/chat-endpointissa
export function buildSystemPrompt(
  business: {
    name: string
    city?: string | null
    cancellation_hours?: number
    general_notes?: string | null
  },
  services: Array<{
    id: string
    name: string
    description?: string | null
    duration_minutes: number
    price: number
  }>
): string {
  const palveluLista = services
    .map((s) => {
      const rivi = `• ${s.name} — ${s.duration_minutes} min — ${Number(s.price).toFixed(2)} €`
      return s.description ? `${rivi} — huomiot: ${s.description}` : rivi
    })
    .join('\n')

  const idLista = services.map((s) => `${s.name}: ${s.id}`).join('\n')

  const yritysRivit = [
    business.city ? `Sijainti: ${business.city}` : null,
    typeof business.cancellation_hours === 'number'
      ? `Peruutukset viimeistään ${business.cancellation_hours} tuntia ennen varausta.`
      : null,
    business.general_notes ? `Huomiot: ${business.general_notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `Olet ${business.name}:n asiakaspalveluavustaja. Tehtäväsi on auttaa asiakkaita valitsemaan sopiva palvelu ja ohjata heitä varaamaan aika.
${yritysRivit ? `\nYRITYSTIEDOT:\n${yritysRivit}\n` : ''}
TARJOTTAVAT PALVELUT:
${palveluLista}

OHJEISTUS:
1. Tervehdi asiakasta lämpimästi ja kysy suoraan mitä palvelua he ovat ajatelleet.
2. Jos asiakas ei tiedä mitä haluaa, suosittele aktiivisesti: kysy hieman asiakkaan tarpeesta ja ehdota sopivaa palvelua sen perusteella. Mainitse lyhyesti mitä palvelu sisältää, kesto ja hinta.
3. Kun asiakas ilmaisee kiinnostuksen tiettyyn palveluun — myös epäsuorasti kuten "se kuulostaa hyvältä" tai "haluaisin kokeilla" — ohjaa heti varaamaan aika lisäämällä vastauksesi LOPPUUN:
   [VARAUS:{"service_id":"<ID>","service_name":"<NIMI>"}]
   Korvaa <ID> oikealla palvelun ID:llä ja <NIMI> palvelun nimellä.
4. Vastaa AINA suomeksi. Ole ytimekäs, lämmin ja kannustava. Pidä viestit lyhyinä — maksimissaan 2–3 lausetta.
5. Älä mainitse teknisiä yksityiskohtia kuten ID-numeroita asiakkaalle.
6. Jos asiakas kysyy aiheesta joka ei liity palveluihin tai varaukseen, vastaa lyhyesti ja palauta keskustelu takaisin palveluihin.
7. Muista: tavoitteesi on saada asiakas varaamaan aika, ei vain jutella. Ohjaa aina konkreettisesti eteenpäin.

PALVELUIDEN ID:T (sisäiseen käyttöön, älä mainitse asiakkaalle):
${idLista}`
}
