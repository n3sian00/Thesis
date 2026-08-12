'use client'

import { useState } from 'react'

interface Props {
  businessId: string
  serviceId: string
  serviceName: string
  startsAt: string  // ISO-string
  endsAt: string    // ISO-string
  onSuccess: () => void
}

// Muotoilee ISO-aikaleiman luettavaan suomalaiseen muotoon
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  })
}

export default function BookingForm({
  businessId,
  serviceId,
  serviceName,
  startsAt,
  endsAt,
  onSuccess,
}: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [virhe, setVirhe] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVirhe(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceId,
          customer_name: name,
          customer_email: email,
          customer_phone: phone || undefined,
          starts_at: startsAt,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setVirhe(data.error ?? 'Varaus epäonnistui. Yritä uudelleen.')
        return
      }

      onSuccess()
    } catch {
      setVirhe('Yhteysvirhe. Tarkista verkkoyhteytesi ja yritä uudelleen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-cream rounded-xl p-4 border border-card-border ml-9">
      {/* Yhteenveto valitusta ajasta */}
      <div className="mb-4">
        <p className="text-xs font-medium text-mocha uppercase tracking-wide mb-1">
          Varauksen tiedot
        </p>
        <p className="text-sm font-semibold text-chocolate">{serviceName}</p>
        <p className="text-xs text-mocha mt-0.5">{formatTime(startsAt)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nimi */}
        <div>
          <label htmlFor="bf-name" className="block text-xs font-medium text-mocha mb-1">
            Nimi
          </label>
          <input
            id="bf-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Etunimi Sukunimi"
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Sähköposti */}
        <div>
          <label htmlFor="bf-email" className="block text-xs font-medium text-mocha mb-1">
            Sähköposti
          </label>
          <input
            id="bf-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sinä@esimerkki.fi"
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Puhelinnumero */}
        <div>
          <label htmlFor="bf-phone" className="block text-xs font-medium text-mocha mb-1">
            Puhelinnumero <span className="text-mocha/60">(valinnainen)</span>
          </label>
          <input
            id="bf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+358 40 123 4567"
            className="w-full px-3 py-2 text-sm rounded-lg border border-card-border bg-white text-chocolate placeholder-mocha/50
                       focus:outline-none focus:ring-2 focus:ring-rose focus:border-transparent"
          />
        </div>

        {/* Virheilmoitus */}
        {virhe && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{virhe}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 text-sm font-medium text-warm-white rounded-lg
                     bg-chocolate hover:bg-chocolate/85
                     focus:outline-none focus:ring-2 focus:ring-rose
                     disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Vahvistetaan...' : 'Vahvista varaus'}
        </button>
      </form>
    </div>
  )
}
