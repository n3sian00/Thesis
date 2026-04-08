'use client'

import { useState, useTransition } from 'react'
import { deleteServiceAction, toggleServiceAction } from '@/app/actions/services'
import EditServiceModal from '@/components/dashboard/EditServiceModal'
import type { Database } from '@/types/database'

type Service = Database['public']['Tables']['services']['Row']

// Muotoilee minuutit luettavaan muotoon: 90 → "1 t 30 min"
function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} t ${m} min` : `${h} t`
}

// Muotoilee hinnan euroiksi
function formatPrice(price: number) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

export default function ServiceRow({ service }: { service: Service }) {
  const [editOpen, setEditOpen] = useState(false)
  const [togglePending, startToggle] = useTransition()
  const [deletePending, startDelete] = useTransition()

  const isPending = togglePending || deletePending

  function handleToggle() {
    const fd = new FormData()
    fd.append('id', service.id)
    fd.append('active', String(service.active))
    startToggle(() => toggleServiceAction(fd))
  }

  function handleDelete() {
    if (!window.confirm(`Poistetaanko palvelu "${service.name}"?`)) return
    const fd = new FormData()
    fd.append('id', service.id)
    startDelete(() => deleteServiceAction(fd))
  }

  return (
    <>
      {editOpen && (
        <EditServiceModal service={service} onClose={() => setEditOpen(false)} />
      )}

    <div
      className={`flex items-center justify-between px-5 py-4 ${
        !service.active ? 'opacity-50' : ''
      }`}
    >
      {/* Palvelun tiedot */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{service.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDuration(service.duration_minutes)} &middot;{' '}
          {formatPrice(Number(service.price))}
        </p>
      </div>

      {/* Toimintopainikkeet */}
      <div className="flex items-center gap-2 ml-4">

        {/* Muokkaa */}
        <button
          onClick={() => setEditOpen(true)}
          disabled={isPending}
          title="Muokkaa palvelua"
          className="p-1.5 rounded-lg text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Aktiivisuuden vaihto */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          title={service.active ? 'Piilota palvelu' : 'Aktivoi palvelu'}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            service.active
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {togglePending
            ? 'Tallennetaan...'
            : service.active
              ? 'Aktiivinen'
              : 'Piilotettu'}
        </button>

        {/* Poisto */}
        <button
          onClick={handleDelete}
          disabled={isPending}
          title="Poista palvelu"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deletePending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
    </>
  )
}
