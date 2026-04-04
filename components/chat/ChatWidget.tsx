'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage from './ChatMessage'
import TimeSlotPicker from '../booking/TimeSlotPicker'
import BookingForm from '../booking/BookingForm'

// --- Tyypit ---

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
}

type Business = {
  id: string
  name: string
  slug: string
  theme: string
}

// Booking-triggerin tiedot, jotka Claude palauttaa vastauksessaan
type BookingTrigger = {
  service_id: string
  service_name: string
} | null

type SelectedSlot = {
  starts_at: string
  ends_at: string
  service_id: string
  service_name: string
  duration_minutes: number
} | null

interface Props {
  business: Business
  services: Service[]
}

// [VARAUS:{...}] -patternia vastaava regex
const BOOKING_TRIGGER_REGEX = /\[VARAUS:(\{[^}]+\})\]/

// Muotoilee hinnan euroiksi
function formatPrice(price: number) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price)
}

// --- Komponentti ---

export default function ChatWidget({ business, services }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [bookingTrigger, setBookingTrigger] = useState<BookingTrigger>(null)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null)
  const [bookingComplete, setBookingComplete] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Vieritetään viimeisimpään viestiin automaattisesti
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, bookingTrigger, selectedSlot])

  // Lähettää viestin Claude-APIlle ja lukee streamin
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      const userMsg: Message = { role: 'user', content: content.trim() }
      const newMessages: Message[] = [...messages, userMsg]

      setMessages(newMessages)
      setInput('')
      setIsStreaming(true)
      setBookingTrigger(null)

      // Lisätään tyhjä assistentin viesti heti — täytetään streamista
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            businessId: business.id,
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error('Virhe AI-vastauksessa')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        // Luetaan stream pala kerrallaan ja päivitetään viimeisin viesti
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          fullResponse += decoder.decode(value, { stream: true })

          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: fullResponse },
          ])
        }

        // Tarkistetaan booking-triggeri koko vastauksen jälkeen
        const match = fullResponse.match(BOOKING_TRIGGER_REGEX)
        if (match) {
          try {
            const triggerData = JSON.parse(match[1]) as {
              service_id: string
              service_name: string
            }
            // Varmistetaan että palvelu löytyy
            const service = services.find((s) => s.id === triggerData.service_id)
            if (service) {
              setBookingTrigger(triggerData)
            }
          } catch {
            // JSON-parsinta epäonnistui — ei näytetä booking UItä
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: 'Pahoittelen, jokin meni pieleen. Yritä uudelleen.',
          },
        ])
      } finally {
        setIsStreaming(false)
        textareaRef.current?.focus()
      }
    },
    [messages, isStreaming, business.id, services]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Kun varaus on valmis — lisätään vahvistusviesti ja nollataan tila
  function handleBookingSuccess() {
    setBookingComplete(true)
    setSelectedSlot(null)
    setBookingTrigger(null)
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content:
          'Varauksesi on vahvistettu! Olet saanut vahvistuksen sähköpostiisi. Nähdään pian!',
      },
    ])
  }

  const isWelcomeState = messages.length === 0 && !isStreaming

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-pink-100/50 flex flex-col h-[620px] overflow-hidden">

      {/* --- Otsikkoalue --- */}
      <div className="px-5 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {business.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-semibold leading-tight">{business.name}</h1>
            <p className="text-xs text-pink-100 mt-0.5">Tekoälyavustaja — varaa aika helposti</p>
          </div>
        </div>
      </div>

      {/* --- Viestialue --- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Tervetuloa-tila: tervehdys + pikavalintanappit */}
        {isWelcomeState && (
          <>
            <ChatMessage
              role="assistant"
              content={`Hei! Olen ${business.name}:n ajanvarausavustaja.\n\nMitä palvelua olet ajatellut?`}
            />
            {services.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {services.slice(0, 5).map((service) => (
                  <button
                    key={service.id}
                    onClick={() =>
                      sendMessage(`Haluaisin varata ajan: ${service.name}`)
                    }
                    className="text-xs px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 bg-pink-50
                               hover:bg-pink-100 transition-colors"
                  >
                    {service.name} — {formatPrice(service.price)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Viestihistoria */}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Latausanimaatio streaming-aikana */}
        {isStreaming &&
          messages.at(-1)?.role === 'assistant' &&
          messages.at(-1)?.content === '' && (
            <div className="flex items-center gap-1.5 pl-9">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          )}

        {/* Aikaslottien valitsin — ilmestyy kun AI triggeröi varauksen */}
        {bookingTrigger && !selectedSlot && !bookingComplete && (
          <TimeSlotPicker
            businessId={business.id}
            serviceId={bookingTrigger.service_id}
            serviceName={bookingTrigger.service_name}
            duration={
              services.find((s) => s.id === bookingTrigger.service_id)
                ?.duration_minutes ?? 60
            }
            onSlotSelected={(slot) =>
              setSelectedSlot({
                ...slot,
                service_id: bookingTrigger.service_id,
                service_name: bookingTrigger.service_name,
                duration_minutes:
                  services.find((s) => s.id === bookingTrigger.service_id)
                    ?.duration_minutes ?? 60,
              })
            }
          />
        )}

        {/* Varauslomake — ilmestyy kun aika on valittu */}
        {selectedSlot && !bookingComplete && (
          <BookingForm
            businessId={business.id}
            serviceId={selectedSlot.service_id}
            serviceName={selectedSlot.service_name}
            startsAt={selectedSlot.starts_at}
            endsAt={selectedSlot.ends_at}
            onSuccess={handleBookingSuccess}
          />
        )}

        {/* Ankkurieleventti automaattiseen vieritykseen */}
        <div ref={bottomRef} />
      </div>

      {/* --- Syötealue --- */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Kirjoita viesti..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-900
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300
                       focus:border-transparent disabled:opacity-60 transition-shadow
                       max-h-28 overflow-y-auto"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            aria-label="Lähetä viesti"
            className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white
                       hover:from-pink-600 hover:to-violet-600
                       focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-1
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 mt-2">
          Enter lähettää · Shift+Enter uusi rivi
        </p>
      </div>
    </div>
  )
}
