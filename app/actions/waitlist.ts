'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Poistaa jonotuslistaentryyn — vain yrityksen omistaja voi poistaa
export async function removeWaitlistAction(entryId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Kirjaudu ensin sisään.'

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!business) return 'Yritystietoja ei löydy.'

  const { error } = await supabase
    .from('waitlist')
    .delete()
    .eq('id', entryId)
    .eq('business_id', business.id)

  if (error) return 'Poistaminen epäonnistui.'

  revalidatePath('/dashboard/bookings')
  return null
}
