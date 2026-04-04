import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Selain-singleton — käytä Client Componentsissa ('use client')
// Supabase-sessio luetaan ja kirjoitetaan selainselaimen evästeisiin
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
