'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Muuntaa salongin nimen URL-turvalliseksi slugiksi
// Esim. "Studio Lumière & Co." → "studio-lumiere-co"
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')                    // hajoittaa ä → a + yhdistävä merkki
    .replace(/[\u0300-\u036f]/g, '')     // poistaa yhdistävät merkit (skandit yms.)
    .replace(/[^a-z0-9]+/g, '-')         // ei-aakkosnumeeriset → väliviiva
    .replace(/^-+|-+$/g, '')             // poistaa alun ja lopun väliviivat
}

// Server Action: kirjautuminen
// Palauttaa virheviestin tai redirectaa /dashboard-sivulle
export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return 'Täytä kaikki kentät.'
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Suomenkieliset virheilmoitukset yleisimmille tilanteille
    if (error.message.includes('Invalid login credentials')) {
      return 'Väärä sähköpostiosoite tai salasana.'
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Vahvista sähköpostiosoitteesi ennen kirjautumista.'
    }
    return 'Kirjautuminen epäonnistui. Yritä uudelleen.'
  }

  redirect('/dashboard')
}

// Server Action: rekisteröityminen
// Luo Supabase Auth -käyttäjän + businesses-rivin automaattisesti
export async function registerAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const businessName = formData.get('businessName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!businessName || !email || !password) {
    return 'Täytä kaikki kentät.'
  }

  if (password.length < 8) {
    return 'Salasanan tulee olla vähintään 8 merkkiä pitkä.'
  }

  const slug = generateSlug(businessName)

  if (!slug) {
    return 'Salongin nimestä ei voitu luoda URL-tunnistetta. Käytä kirjaimia tai numeroita.'
  }

  const supabase = await createSupabaseServerClient()

  // Luodaan Auth-käyttäjä
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return 'Tällä sähköpostiosoitteella on jo tili. Kirjaudu sisään.'
    }
    return 'Tilin luominen epäonnistui. Yritä uudelleen.'
  }

  if (!authData.user) {
    return 'Tilin luominen epäonnistui. Yritä uudelleen.'
  }

  // Luodaan yritysprofiili businesses-tauluun
  const { error: businessError } = await supabase.from('businesses').insert({
    user_id: authData.user.id,
    name: businessName,
    slug,
  })

  if (businessError) {
    // Slug on jo käytössä
    if (businessError.code === '23505') {
      return `URL-tunniste "${slug}" on jo käytössä. Kokeile eri salongin nimeä.`
    }
    return 'Yritystietojen tallentaminen epäonnistui. Yritä uudelleen.'
  }

  redirect('/dashboard')
}
