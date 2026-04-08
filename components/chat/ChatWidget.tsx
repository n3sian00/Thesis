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

type DirectStep = 'services' | 'slots' | 'form'

interface Props {
  business: Business
  services: Service[]
}

// [VARAUS:{...}] -patternia vastaava regex
const BOOKING_TRIGGER_REGEX = /\[VARAUS:(\{[^}]+\})\]/

function formatPrice(price: number) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price)
}

// --- Komponentti ---

export default function ChatWidget({ business, services }: Props) {
  // Chat-tila
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [bookingTrigger, setBookingTrigger] = useState<BookingTrigger>(null)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null)
  const [bookingComplete, setBookingComplete] = useState(false)

  // Suora varausflow
  const [directMode, setDirectMode] = useState(false)
  const [directStep, setDirectStep] = useState<DirectStep>('services')
  const [directService, setDirectService] = useState<Service | null>(null)
  const [directSlot, setDirectSlot] = useState<{ starts_at: string; ends_at: string } | null>(null)
  const [directDone, setDirectDone] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, bookingTrigger, selectedSlot, directStep, directDone])

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

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      // AbortController mahdollistaa streamin keskeyttämisen (unmount / uusi viesti)
      const abortController = new AbortController()

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, businessId: business.id }),
          signal: abortController.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}: AI-vastaus epäonnistui`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            fullResponse += decoder.decode(value, { stream: true })
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: fullResponse },
            ])
          }
        } finally {
          reader.releaseLock()
        }

        // Tarkistetaan [VARAUS:{...}] -triggeri valmiin vastauksen lopusta
        const match = fullResponse.match(BOOKING_TRIGGER_REGEX)
        if (match) {
          try {
            const triggerData = JSON.parse(match[1]) as {
              service_id: string
              service_name: string
            }
            const service = services.find((s) => s.id === triggerData.service_id)
            if (service) setBookingTrigger(triggerData)
          } catch {
            // JSON-parsinta epäonnistui — ei haittaa, chat jatkuu normaalisti
          }
        }
      } catch (err) {
        // Ei näytetä virhettä jos käyttäjä itse keskeytti (navigointi, unmount)
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        console.error('[ChatWidget] Streaming error:', err)
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: 'Pahoittelen, jokin meni pieleen. Yritä uudelleen.' },
        ])
      } finally {
        setIsStreaming(false)
        textareaRef.current?.focus()
      }

      return () => abortController.abort()
    },
    [messages, isStreaming, business.id, services]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Varausvahvistus chat-flowssa
  function handleBookingSuccess() {
    setBookingComplete(true)
    setSelectedSlot(null)
    setBookingTrigger(null)
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Varauksesi on vahvistettu! Olet saanut vahvistuksen sähköpostiisi. Nähdään pian!',
      },
    ])
  }

  // Suora varausflow: avaa flow ja nollaa tila
  function openDirectMode() {
    setDirectMode(true)
    setDirectStep('services')
    setDirectService(null)
    setDirectSlot(null)
    setDirectDone(false)
  }

  // Takaisin-logiikka suorassa flowssa
  function handleDirectBack() {
    if (directDone) {
      setDirectMode(false)
    } else if (directStep === 'form') {
      setDirectStep('slots')
      setDirectSlot(null)
    } else if (directStep === 'slots') {
      setDirectStep('services')
      setDirectService(null)
    } else {
      setDirectMode(false)
    }
  }

  // Varausvahvistus suorassa flowssa
  function handleDirectBookingSuccess() {
    setDirectDone(true)
  }

  const isWelcomeState = messages.length === 0 && !isStreaming

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-pink-100/50 flex flex-col h-[620px] overflow-hidden">

      {/* --- Otsikkoalue --- */}
      <div className="px-5 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
              {business.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold leading-tight truncate">{business.name}</h1>
              <p className="text-xs text-pink-100 mt-0.5">Tekoälyavustaja — varaa aika helposti</p>
            </div>
          </div>

          {/* "Varaa aika suoraan" / "← Chat" -nappi */}
          {!directMode ? (
            <button
              onClick={openDirectMode}
              className="shrink-0 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Varaa aika suoraan →
            </button>
          ) : (
            <button
              onClick={handleDirectBack}
              className="shrink-0 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              ← {directDone ? 'Sulje' : directStep === 'services' ? 'Chat' : 'Takaisin'}
            </button>
          )}
        </div>
      </div>

      {/* --- Sisältöalue --- */}
      {directMode ? (
        /* SUORA VARAUSFLOW */
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {directDone ? (
            /* Vahvistus */
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Varaus vahvistettu!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Vahvistus on lähetetty sähköpostiisi. Nähdään pian!
                </p>
              </div>
              <button
                onClick={() => setDirectMode(false)}
                className="text-sm text-pink-600 hover:underline"
              >
                Palaa chattiin
              </button>
            </div>

          ) : directStep === 'services' ? (
            /* Vaihe 1: Palvelulista */
            <>
              <p className="text-sm font-medium text-gray-700">Valitse palvelu</p>
              <div className="space-y-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setDirectService(s)
                      setDirectStep('slots')
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200
                               hover:border-pink-300 hover:bg-pink-50 transition-colors text-left group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 group-hover:text-pink-700">
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.duration_minutes} min</p>
                    </div>
                    <span className="text-sm font-semibold text-pink-600 shrink-0 ml-3">
                      {formatPrice(s.price)}
                    </span>
                  </button>
                ))}
              </div>
            </>

          ) : directStep === 'slots' && directService ? (
            /* Vaihe 2: Aikavalinta */
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {directService.name}
                </p>
                <span className="text-xs text-gray-400">{directService.duration_minutes} min · {formatPrice(directService.price)}</span>
              </div>
              <TimeSlotPicker
                businessId={business.id}
                serviceName={directService.name}
                duration={directService.duration_minutes}
                onSlotSelected={(slot) => {
                  setDirectSlot(slot)
                  setDirectStep('form')
                }}
              />
            </>

          ) : directStep === 'form' && directService && directSlot ? (
            /* Vaihe 3: Yhteystiedot */
            <BookingForm
              businessId={business.id}
              serviceId={directService.id}
              serviceName={directService.name}
              startsAt={directSlot.starts_at}
              endsAt={directSlot.ends_at}
              onSuccess={handleDirectBookingSuccess}
            />
          ) : null}

          <div ref={bottomRef} />
        </div>

      ) : (
        /* CHAT */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

            {/* Tervetuloa-tila */}
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
                        onClick={() => sendMessage(`Haluaisin varata ajan: ${service.name}`)}
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

            {/* Latausanimaatio */}
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

            {/* Chat-triggeroitu aikavalinta */}
            {bookingTrigger && !selectedSlot && !bookingComplete && (
              <TimeSlotPicker
                businessId={business.id}
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

            {/* Chat-triggeroitu varauslomake */}
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

            <div ref={bottomRef} />
          </div>

          {/* Syötealue */}
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-300 mt-2">
              Enter lähettää · Shift+Enter uusi rivi
            </p>
          </div>
        </>
      )}
    </div>
  )
}
