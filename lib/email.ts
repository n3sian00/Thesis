import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('Ympäristömuuttuja RESEND_API_KEY puuttuu.')
}

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@kauneusai.fi'

// Lähettää varausvahvistuksen asiakkaalle.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingConfirmationToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  date: string   // esim. "tiistai 8. huhtikuuta 2026"
  time: string   // esim. "14:30"
  businessName: string
}): Promise<boolean> {
  const { customerName, customerEmail, serviceName, date, time, businessName } = params

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: `Varausvahvistus — ${serviceName} @ ${businessName}`,
    text: `Hei ${customerName},

varauksesi on vahvistettu!

Palvelu: ${serviceName}
Aika: ${date} klo ${time}
Paikka: ${businessName}

Muutoksia tai peruutuksia varten ota yhteyttä suoraan ${businessName}:iin.

Nähdään pian!
${businessName}`,
  })

  if (error) {
    console.error('Varausvahvistuksen lähetys epäonnistui:', error)
    return false
  }
  return true
}

// Lähettää ilmoituksen uudesta varauksesta yrittäjälle.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingNotificationToOwner(params: {
  customerName: string
  customerPhone?: string | null
  serviceName: string
  date: string
  time: string
  ownerEmail: string
}): Promise<boolean> {
  const { customerName, customerPhone, serviceName, date, time, ownerEmail } = params

  const { error } = await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Uusi varaus — ${serviceName} ${date} klo ${time}`,
    text: `Uusi varaus saapui!

Palvelu: ${serviceName}
Aika: ${date} klo ${time}

Asiakas: ${customerName}${customerPhone ? `\nPuhelin: ${customerPhone}` : ''}`,
  })

  if (error) {
    console.error('Yrittäjän ilmoituksen lähetys epäonnistui:', error)
    return false
  }
  return true
}

// Lähettää 24h muistutuksen asiakkaalle ennen varausta.
// Palauttaa true jos lähetys onnistui, false jos epäonnistui.
export async function sendBookingReminderToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  date: string   // esim. "tiistai 8. huhtikuuta 2026"
  time: string   // esim. "14:30"
  businessName: string
}): Promise<boolean> {
  const { customerName, customerEmail, serviceName, date, time, businessName } = params

  const { error } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: `Muistutus huomisesta varauksesta — ${serviceName} @ ${businessName}`,
    text: `Hei ${customerName},

muistutuksena: sinulla on varaus huomenna!

Palvelu: ${serviceName}
Aika: ${date} klo ${time}
Paikka: ${businessName}

Muutoksia tai peruutuksia varten ota yhteyttä suoraan ${businessName}:iin.

Nähdään pian!
${businessName}`,
  })

  if (error) {
    console.error('Muistutuksen lähetys epäonnistui:', error)
    return false
  }
  return true
}
