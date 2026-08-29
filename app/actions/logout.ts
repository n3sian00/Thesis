'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'

// Server Action: uloskirjautuminen
// Tyhjentää Supabase-session evästeet ja ohjaa kirjautumissivulle
export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect({ href: '/login', locale: await getLocale() })
}
