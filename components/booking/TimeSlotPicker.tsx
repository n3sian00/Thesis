'use client'

import { useState, useEffect } from 'react'
import { nextDaysHelsinki, formatDayHelsinki, formatTimeHelsinki } from '@/lib/dates'

interface SelectedSlot {
  starts_at: string
  ends_at: string
}

interface Props {
  businessId: string
  serviceName: string
  duration: number  // minuuteissa
  onSlotSelected: (slot: SelectedSlot) => void
}

export default function TimeSlotPicker({
  businessId,
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

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setVirhe(null)
    setSlots([])

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
      ) : slots.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">
          Ei vapaita aikoja tänä päivänä. Kokeile toista päivää.
        </p>
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
