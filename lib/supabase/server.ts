import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Server-client — käytä Server Componentsissa, Route Handlereissa ja Server Actionsissa
// Lukee ja kirjoittaa session evästeet next/headers cookies()-funktion kautta
// Huom: cookies() on asynkroninen Next.js 16:ssa
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll-kutsu Server Componentista — evästeitä ei voi asettaa
            // Middleware huolehtii session päivityksestä
          }
        },
      },
    }
  )
}

// Admin-client — ohittaa RLS-politiikat, ei tarvitse evästeitä
// Käytä VAIN luotetuissa server-operaatioissa: muistutuscron, admin-toiminnot
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
