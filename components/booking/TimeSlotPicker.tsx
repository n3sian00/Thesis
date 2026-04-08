'use client'

import { useState, useEffect } from 'react'

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

// Generoi seuraavat N päivää (pois lukien sunnuntait)
function getNextDays(n: number): Date[] {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let current = new Date(today)

  while (days.length < n) {
    current = new Date(current)
    current.setDate(current.getDate() + 1)
    if (current.getDay() !== 0) { // 0 = sunnuntai, suljettu
      days.push(new Date(current))
    }
  }
  return days
}

function formatDay(date: Date) {
  return date.toLocaleDateString('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TimeSlotPicker({
  businessId,
  serviceName,
  duration,
  onSlotSelected,
}: Props) {
  const days = getNextDays(7)
  const [selectedDay, setSelectedDay] = useState<Date>(days[0])
  const [slots, setSlots] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [virhe, setVirhe] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setVirhe(null)
    setSlots([])

    const dateStr = selectedDay.toISOString().split('T')[0]

    fetch(
      `/api/bookings?business_id=${businessId}&date=${dateStr}&duration=${duration}`
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
        {days.map((day) => {
          const isSelected = day.toDateString() === selectedDay.toDateString()
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-violet-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
              }`}
            >
              {formatDay(day)}
            </button>
          )
        })}
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
              {formatTime(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
