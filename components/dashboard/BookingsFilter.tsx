'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'

export default function BookingsFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const hasFilters = q || status

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tekstihaku */}
      <div className="relative flex-1 min-w-48">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => update('q', e.target.value)}
          placeholder="Hae nimellä tai sähköpostilla..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
        />
      </div>

      {/* Tilasuodatin */}
      <select
        value={status}
        onChange={(e) => update('status', e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700
                   focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
      >
        <option value="">Kaikki tilat</option>
        <option value="confirmed">Vahvistettu</option>
        <option value="cancelled">Peruutettu</option>
        <option value="completed">Toteutunut</option>
      </select>

      {/* Tyhjennä-nappi */}
      {hasFilters && (
        <button
          onClick={() => {
            startTransition(() => router.replace(pathname))
          }}
          disabled={isPending}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100
                     rounded-lg transition-colors disabled:opacity-50"
        >
          Tyhjennä
        </button>
      )}

      {isPending && (
        <span className="text-xs text-gray-400">Haetaan...</span>
      )}
    </div>
  )
}
