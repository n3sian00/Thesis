import Anthropic from '@anthropic-ai/sdk'

// Käytetty malli — vaihda tarvittaessa
export const CLAUDE_MODEL = 'claude-sonnet-4-6'

// Singleton-client — alustetaan kerran, käytetään kaikissa Route Handlereissa
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Rakentaa system promptin yrityksen palveluiden perusteella
// Käytetään /api/chat-endpointissa
export function buildSystemPrompt(
  businessName: string,
  services: Array<{
    id: string
    name: string
    duration_minutes: number
    price: number
  }>
): string {
  const palveluLista = services
    .map(
      (s) =>
        `• ${s.name} — ${s.duration_minutes} min — ${Number(s.price).toFixed(2)} €`
    )
    .join('\n')

  // ID-lista erikseen (AI tarvitsee tätä booking-triggerin rakentamiseen)
  const idLista = services.map((s) => `${s.name}: ${s.id}`).join('\n')

  return `Olet ${businessName}:n asiakaspalveluavustaja. Tehtäväsi on auttaa asiakkaita valitsemaan sopiva palvelu ja varaamaan aika.

TARJOTTAVAT PALVELUT:
${palveluLista}

OHJEISTUS:
1. Tervehdi asiakasta ystävällisesti ja kysy mitä he tarvitsevat.
2. Kerro palveluista selkeästi ja auta asiakasta päätöksenteossa.
3. Kun asiakas on selvästi päättänyt tietyn palvelun, lisää vastauksesi LOPPUUN seuraava rivi (ei näy asiakkaalle):
   [VARAUS:{"service_id":"<ID>","service_name":"<NIMI>"}]
   Korvaa <ID> oikealla ID:llä ja <NIMI> palvelun nimellä.
4. Vastaa AINA suomeksi.
5. Ole ytimekäs, lämmin ja ammattimainen. Pidä vastaukset lyhyinä.
6. Älä mainitse teknisiä yksityiskohtia kuten ID-numeroita asiakkaalle.
7. Jos asiakas kysyy muusta kuin palveluista tai varauksesta, ohjaa heidät takaisin aiheeseen.

PALVELUIDEN ID:T (sisäiseen käyttöön, älä mainitse asiakkaalle):
${idLista}`
}
