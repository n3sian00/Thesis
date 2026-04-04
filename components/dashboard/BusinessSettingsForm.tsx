'use client'

import { useActionState } from 'react'
import { updateBusinessAction } from '@/app/actions/business'

const TEEMAT = [
  { value: 'pink', label: 'Pinkki' },
  { value: 'lavender', label: 'Laventeli' },
  { value: 'rose', label: 'Ruusu' },
  { value: 'teal', label: 'Sinivihreä' },
]

interface Props {
  business: {
    id: string
    name: string
    slug: string
    city: string | null
    cancellation_hours: number
    theme: string
  }
}

export default function BusinessSettingsForm({ business }: Props) {
  const [tulos, toiminto, lataa] = useActionState(updateBusinessAction, null)

  return (
    <form action={toiminto} className="space-y-6 max-w-lg">

      {/* Salongin nimi */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Salongin nimi
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={business.name}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
        />
      </div>

      {/* Kaupunki */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          Kaupunki
        </label>
        <input
          id="city"
          name="city"
          type="text"
          defaultValue={business.city ?? ''}
          placeholder="esim. Helsinki"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
        />
      </div>

      {/* URL-tunniste (vain näyttö, ei muokattavissa) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL-tunniste
        </label>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-100 bg-gray-50">
          <span className="text-gray-400 text-sm">kauneusai.fi/</span>
          <span className="text-sm font-medium text-gray-700">{business.slug}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">URL-tunnistetta ei voi muuttaa rekisteröinnin jälkeen.</p>
      </div>

      {/* Peruutusaika */}
      <div>
        <label htmlFor="cancellation_hours" className="block text-sm font-medium text-gray-700 mb-1">
          Peruutusaika (tuntia ennen)
        </label>
        <input
          id="cancellation_hours"
          name="cancellation_hours"
          type="number"
          min={0}
          max={168}
          required
          defaultValue={business.cancellation_hours}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
        />
        <p className="text-xs text-gray-400 mt-1">
          Asiakas voi peruuttaa varauksen tähän asti etukäteen.
        </p>
      </div>

      {/* Teema */}
      <div>
        <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
          Chat-teema
        </label>
        <select
          id="theme"
          name="theme"
          defaultValue={business.theme}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 bg-white
                     focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
        >
          {TEEMAT.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">Asiakkaiden chat-ikkunan värimaailma.</p>
      </div>

      {/* Palaute */}
      {tulos === null && !lataa ? null : tulos ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{tulos}</p>
      ) : null}

      <button
        type="submit"
        disabled={lataa}
        className="px-5 py-2.5 text-sm font-medium text-white rounded-lg
                   bg-gradient-to-r from-pink-500 to-violet-500
                   hover:from-pink-600 hover:to-violet-600
                   focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {lataa ? 'Tallennetaan...' : 'Tallenna muutokset'}
      </button>
    </form>
  )
}
