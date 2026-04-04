'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Server Action: uloskirjautuminen
// Tyhjentää Supabase-session evästeet ja ohjaa kirjautumissivulle
export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
