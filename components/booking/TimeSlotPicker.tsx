'use client'

import { useState, useEffect } from 'react'
import { nextDaysHelsinki, formatDayHelsinki, formatTimeHelsinki } from '@/lib/dates'

interface SelectedSlot {
  starts_at: string
  ends_at: string
}

interface Props {
  businessId: string
  serviceId: string
  serviceName: string
  duration: number  // minuuteissa
  onSlotSelected: (slot: SelectedSlot) => void
}

export default function TimeSlotPicker({
  businessId,
  serviceId,
  serviceName,
  duration,
  onSlotSelected,
}: Props) {
  // Päivät ovat nyt YYYY-MM-DD -merkkijonoja Helsingin ajassa
  const days = nextDaysHelsinki(7)
  const [selectedDay, setSelectedDay] = useState<string>(days[0])
  const [slots, setSlots] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [virhe, setVirhe] = useState<string | null>(null)

  // Jonotuslista-lomakkeen tila
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistPending, setWaitlistPending] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [waitlistDone, setWaitlistDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setVirhe(null)
    setSlots([])
    setShowWaitlist(false)

    // selectedDay on jo YYYY-MM-DD — ei enää UTC-leikkausongelmaa
    fetch(
      `/api/bookings?business_id=${businessId}&date=${selectedDay}&duration=${duration}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) setVirhe(data.error)
        else setSlots(data.slots ?? [])
      })
      .catch(() => { if (!cancelled) setVirhe('Aikojen haku epäonnistui.') })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [selectedDay, businessId, duration])

  function handleSlotClick(slotIso: string) {
    const start = new Date(slotIso)
    const end = new Date(start.getTime() + duration * 60 * 1000)
    onSlotSelected({ starts_at: start.toISOString(), ends_at: end.toISOString() })
  }

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWaitlistError(null)
    setWaitlistPending(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceId,
          customer_name: waitlistName,
          customer_email: waitlistEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setWaitlistError(data.error ?? 'Jonotuslistalle liittyminen epäonnistui.')
      } else {
        setWaitlistDone(true)
      }
    } catch {
      setWaitlistError('Yhteysvirhe. Tarkista verkkoyhteytesi.')
    } finally {
      setWaitlistPending(false)
    }
  }

  const noSlots = !isLoading && !virhe && slots.length === 0

  return (
    <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 ml-9">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Valitse aika — {serviceName} ({duration} min)
      </p>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              day === selectedDay
                ? 'bg-violet-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
            }`}
          >
            {formatDayHelsinki(day)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 text-center py-3">Haetaan vapaita aikoja...</p>
      ) : virhe ? (
        <p className="text-xs text-red-500 text-center py-3">{virhe}</p>
      ) : noSlots ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 text-center py-1">
            Ei vapaita aikoja tänä päivänä. Kokeile toista päivää.
          </p>

          {waitlistDone ? (
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs font-medium text-green-700">
                Sinut on lisätty jonotuslistalle!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Saat sähköpostin kun aika vapautuu.
              </p>
            </div>
          ) : !showWaitlist ? (
            <button
              onClick={() => setShowWaitlist(true)}
              className="w-full py-2 text-xs font-medium text-violet-600 border border-violet-200
                         rounded-lg hover:bg-violet-100 transition-colors"
            >
              Liity jonotuslistalle
            </button>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-2">
              <p className="text-xs font-medium text-gray-600">
                Ilmoitamme kun aika vapautuu.
              </p>
              <input
                type="text"
                required
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                placeholder="Nimesi"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-900
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="Sähköpostiosoitteesi"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-900
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
              {waitlistError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5">{waitlistError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={waitlistPending}
                  className="flex-1 py-2 text-xs font-medium text-white rounded-lg
                             bg-gradient-to-r from-violet-500 to-pink-500
                             hover:from-violet-600 hover:to-pink-600
                             disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {waitlistPending ? 'Lisätään...' : 'Liity jonoon'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWaitlist(false)}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-lg
                             hover:bg-white transition-colors"
                >
                  Peruuta
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => handleSlotClick(slot)}
              className="py-2 rounded-lg text-xs font-medium bg-white border border-gray-200
                         text-gray-700 hover:bg-violet-500 hover:text-white hover:border-violet-500
                         transition-colors"
            >
              {formatTimeHelsinki(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
