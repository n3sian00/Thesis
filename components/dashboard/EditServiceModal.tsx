'use client'

import { useActionState, useEffect, useRef } from 'react'
import { updateServiceAction } from '@/app/actions/services'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

interface Props {
  service: Service
  onClose: () => void
}

export default function EditServiceModal({ service, onClose }: Props) {
  const [virhe, toiminto, lataa] = useActionState(updateServiceAction, null)
  const prevLataa = useRef(false)

  // Suljetaan modaali kun toiminto valmistuu ilman virhettä
  useEffect(() => {
    if (prevLataa.current && !lataa && virhe === null) {
      onClose()
    }
    prevLataa.current = lataa
  }, [lataa, virhe, onClose])

  // Suljetaan Escape-näppäimellä
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    /* Taustaoverlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* Otsikkorivi */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Muokkaa palvelua</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Sulje"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={toiminto} className="space-y-4">
          {/* Piilotettu ID */}
          <input type="hidden" name="id" value={service.id} />

          {/* Nimi */}
          <div>
            <label htmlFor="edit-name" className="block text-xs font-medium text-gray-600 mb-1">
              Nimi
            </label>
            <input
              id="edit-name"
              name="name"
              type="text"
              required
              defaultValue={service.name}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
            />
          </div>

          {/* Kuvaus */}
          <div>
            <label htmlFor="edit-description" className="block text-xs font-medium text-gray-600 mb-1">
              Kuvaus <span className="text-gray-400 font-normal">(valinnainen)</span>
            </label>
            <textarea
              id="edit-description"
              name="description"
              rows={2}
              defaultValue={service.description ?? ''}
              placeholder="Lyhyt kuvaus palvelusta asiakkaalle…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 resize-none
                         focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
            />
          </div>

          {/* Kesto ja hinta rinnakkain */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-duration" className="block text-xs font-medium text-gray-600 mb-1">
                Kesto (min)
              </label>
              <input
                id="edit-duration"
                name="duration_minutes"
                type="number"
                required
                min={5}
                step={5}
                defaultValue={service.duration_minutes}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="edit-price" className="block text-xs font-medium text-gray-600 mb-1">
                Hinta (€)
              </label>
              <input
                id="edit-price"
                name="price"
                type="number"
                required
                min={0}
                step={0.5}
                defaultValue={Number(service.price)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          {/* Virheilmoitus */}
          {virhe && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {virhe}
            </p>
          )}

          {/* Toimintopainikkeet */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={lataa}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200
                         hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={lataa}
              className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg
                         bg-gradient-to-r from-pink-500 to-violet-500
                         hover:from-pink-600 hover:to-violet-600
                         focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {lataa ? 'Tallennetaan...' : 'Tallenna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
