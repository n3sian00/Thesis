'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { addSlotAction, deleteSlotAction } from '@/app/actions/slots'

// --- Tyypit ---

type SlotWindow = {
  id: string
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  has_bookings: boolean
}

type DayBooking = {
  id: string
  starts_at: string
  ends_at: string
  customer_name: string
  service_name: string
}

type DayDetail = {
  windows: SlotWindow[]
  bookings: DayBooking[]
}

// --- Apufunktiot ---

// Palauttaa kuukauden päivät ma-ensin, null = täyttöpäivä
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  // JS getDay(): 0=su → muunnetaan: 0=ma, 6=su
  const startPad = (first.getDay() + 6) % 7
  const grid: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function formatDayHeading(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('fi-FI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fi-FI', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

const MONTH_NAMES = [
  'Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu',
  'Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu',
]
const DAY_NAMES = ['Ma','Ti','Ke','To','Pe','La','Su']

// --- Komponentti ---

interface Props {
  businessId: string
}

export default function CalendarView({ businessId: _businessId }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [slotDates, setSlotDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [isLoadingDay, setIsLoadingDay] = useState(false)

  // Lisää-lomakkeen tila
  const [addStart, setAddStart] = useState('09:00')
  const [addEnd, setAddEnd] = useState('17:00')
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Haetaan kuukauden slot-päivät vihreälle pisteelle
  const fetchMonthData = useCallback(async () => {
    const res = await fetch(`/api/slots?month=${toMonthStr(year, month)}`)
    if (!res.ok) return
    const data = await res.json()
    setSlotDates(new Set(data.dates ?? []))
  }, [year, month])

  useEffect(() => { fetchMonthData() }, [fetchMonthData])

  // Haetaan valitun päivän ikkunat ja varaukset
  const fetchDayDetail = useCallback(async (date: string) => {
    setIsLoadingDay(true)
    setDayDetail(null)
    const res = await fetch(`/api/slots?date=${date}`)
    if (res.ok) setDayDetail(await res.json())
    setIsLoadingDay(false)
  }, [])

  useEffect(() => {
    if (selectedDate) fetchDayDetail(selectedDate)
  }, [selectedDate, fetchDayDetail])

  // Kuukauden vaihto
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  // Päivää klikatessa
  function handleDayClick(date: Date) {
    const str = toDateStr(date)
    setSelectedDate(prev => prev === str ? null : str)
    setAddError(null)
    setDeleteError(null)
  }

  // Lisää aikaikkuna
  function handleAdd() {
    if (!selectedDate) return
    setAddError(null)
    startTransition(async () => {
      const err = await addSlotAction({
        date: selectedDate,
        start_time: addStart,
        end_time: addEnd,
      })
      if (err) {
        setAddError(err)
      } else {
        setAddStart('09:00')
        setAddEnd('17:00')
        await fetchDayDetail(selectedDate)
        await fetchMonthData()
      }
    })
  }

  // Poista aikaikkuna
  function handleDelete(slotId: string) {
    setDeleteError(null)
    startTransition(async () => {
      const err = await deleteSlotAction(slotId)
      if (err) {
        setDeleteError(err)
      } else if (selectedDate) {
        await fetchDayDetail(selectedDate)
        await fetchMonthData()
      }
    })
  }

  const todayStr = toDateStr(today)
  const grid = getMonthGrid(year, month)

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* --- Kuukausikalenteri --- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:w-80 shrink-0">

        {/* Kuukauden otsikko + navigaatio */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Edellinen kuukausi"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Seuraava kuukausi"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Viikonpäivien otsikkorivi */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Päiväruudukko */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {grid.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />

            const dateStr = toDateStr(day)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasSlots = slotDates.has(dateStr)
            const isPast = day < today && !isToday

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-pink-500 text-white'
                    : isToday
                    ? 'bg-pink-50 text-pink-600 ring-1 ring-pink-300'
                    : isPast
                    ? 'text-gray-300 hover:bg-gray-50'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {day.getDate()}
                {/* Vihreä piste = päivällä on aikaikkunoita */}
                {hasSlots && (
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      isSelected ? 'bg-pink-200' : 'bg-green-400'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Selite */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400">Aikaikkunoita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400" />
            <span className="text-xs text-gray-400">Valittu</span>
          </div>
        </div>
      </div>

      {/* --- Päivänäkymä --- */}
      <div className="flex-1 min-w-0">
        {!selectedDate ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Valitse päivä kalenterista</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">

            {/* Päivän otsikko */}
            <div className="px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900 capitalize">
                {formatDayHeading(selectedDate)}
              </h2>
            </div>

            {isLoadingDay ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Ladataan...
              </div>
            ) : (
              <>
                {/* Aikaikkunat */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Aikaikkunat
                  </h3>

                  {deleteError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                      {deleteError}
                    </p>
                  )}

                  {!dayDetail?.windows.length ? (
                    <p className="text-sm text-gray-400">
                      Ei aikaikkunoita — lisää alla.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayDetail.windows.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                        >
                          <span className="text-sm font-medium text-gray-800 tabular-nums">
                            {w.start_time} – {w.end_time}
                          </span>
                          {w.has_bookings ? (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              Varauksilla
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDelete(w.id)}
                              disabled={isPending}
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded-lg
                                         transition-colors disabled:opacity-50"
                            >
                              Poista
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Varaukset */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Varaukset
                  </h3>
                  {!dayDetail?.bookings.length ? (
                    <p className="text-sm text-gray-400">Ei varauksia.</p>
                  ) : (
                    <div className="space-y-2">
                      {dayDetail.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg bg-green-50"
                        >
                          <span className="text-sm font-semibold text-gray-700 tabular-nums w-10 shrink-0">
                            {formatBookingTime(b.starts_at)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {b.service_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {b.customer_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lisää aikaikkuna */}
                <div className="px-5 py-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Lisää aikaikkuna
                  </h3>

                  {addError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                      {addError}
                    </p>
                  )}

                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Alku</label>
                      <input
                        type="time"
                        value={addStart}
                        onChange={(e) => setAddStart(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900
                                   focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Loppu</label>
                      <input
                        type="time"
                        value={addEnd}
                        onChange={(e) => setAddEnd(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900
                                   focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleAdd}
                      disabled={isPending}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg
                                 bg-gradient-to-r from-pink-500 to-violet-500
                                 hover:from-pink-600 hover:to-violet-600
                                 focus:outline-none focus:ring-2 focus:ring-pink-300
                                 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      {isPending ? 'Lisätään...' : 'Lisää'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
