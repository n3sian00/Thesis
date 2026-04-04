'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Päivitä yrityksen perustiedot
export async function updateBusinessAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = (formData.get('name') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const cancellation_hours = parseInt(formData.get('cancellation_hours') as string, 10)
  const theme = formData.get('theme') as string

  if (!name) return 'Salongin nimi on pakollinen.'
  if (isNaN(cancellation_hours) || cancellation_hours < 0)
    return 'Peruutusaika ei voi olla negatiivinen.'

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 'Kirjaudu ensin sisään.'

  const { error } = await supabase
    .from('businesses')
    .update({ name, city: city || null, cancellation_hours, theme })
    .eq('user_id', user.id)

  if (error) return 'Tietojen tallentaminen epäonnistui.'

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return null
}
