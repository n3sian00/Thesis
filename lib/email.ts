import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@kauneusai.fi'

// Lähettää varausvahvistuksen asiakkaalle
export async function sendBookingConfirmationToCustomer(params: {
  customerName: string
  customerEmail: string
  serviceName: string
  date: string   // esim. "tiistai 8. huhtikuuta 2026"
  time: string   // esim. "14:30"
  businessName: string
}) {
  const { customerName, customerEmail, serviceName, date, time, businessName } = params

  await resend.emails.send({
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
}

// Lähettää ilmoituksen uudesta varauksesta yrittäjälle
export async function sendBookingNotificationToOwner(params: {
  customerName: string
  customerPhone?: string | null
  serviceName: string
  date: string
  time: string
  ownerEmail: string
}) {
  const { customerName, customerPhone, serviceName, date, time, ownerEmail } = params

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Uusi varaus — ${serviceName} ${date} klo ${time}`,
    text: `Uusi varaus saapui!

Palvelu: ${serviceName}
Aika: ${date} klo ${time}

Asiakas: ${customerName}${customerPhone ? `\nPuhelin: ${customerPhone}` : ''}`,
  })
}
