'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Apufunktio: hakee autentikoidun käyttäjän yrityksen ID:n
async function getOwnBusiness() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, businessId: null }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return { supabase, businessId: business?.id ?? null }
}

// Lisää uusi palvelu
export async function createServiceAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = (formData.get('name') as string)?.trim()
  const durationRaw = formData.get('duration_minutes') as string
  const priceRaw = formData.get('price') as string

  if (!name) return 'Palvelun nimi on pakollinen.'

  const duration_minutes = parseInt(durationRaw, 10)
  const price = parseFloat(priceRaw.replace(',', '.')) // salli sekä piste että pilkku

  if (isNaN(duration_minutes) || duration_minutes < 1)
    return 'Kesto tulee olla vähintään 1 minuutti.'
  if (isNaN(price) || price < 0) return 'Hinta ei voi olla negatiivinen.'

  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return 'Kirjaudu ensin sisään.'

  const { error } = await supabase.from('services').insert({
    business_id: businessId,
    name,
    duration_minutes,
    price,
  })

  if (error) return 'Palvelun lisääminen epäonnistui. Yritä uudelleen.'

  revalidatePath('/dashboard/services')
  return null
}

// Muokkaa palvelua
export async function updateServiceAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const id = (formData.get('id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const durationRaw = formData.get('duration_minutes') as string
  const priceRaw = formData.get('price') as string
  const description = (formData.get('description') as string)?.trim() || null

  if (!id) return 'Palvelun ID puuttuu.'
  if (!name) return 'Palvelun nimi on pakollinen.'

  const duration_minutes = parseInt(durationRaw, 10)
  const price = parseFloat(priceRaw.replace(',', '.'))

  if (isNaN(duration_minutes) || duration_minutes < 1)
    return 'Kesto tulee olla vähintään 1 minuutti.'
  if (isNaN(price) || price < 0) return 'Hinta ei voi olla negatiivinen.'

  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return 'Kirjaudu ensin sisään.'

  const { error } = await supabase
    .from('services')
    .update({ name, description, duration_minutes, price })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return 'Palvelun tallennus epäonnistui. Yritä uudelleen.'

  revalidatePath('/dashboard/services')
  return null
}

// Poista palvelu (business_id-tarkistus RLS:n lisäksi)
export async function deleteServiceAction(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return

  await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/dashboard/services')
}

// Vaihda palvelun aktiivisuustila
export async function toggleServiceAction(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const currentActive = formData.get('active') === 'true'

  const { supabase, businessId } = await getOwnBusiness()
  if (!businessId) return

  await supabase
    .from('services')
    .update({ active: !currentActive })
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/dashboard/services')
}
