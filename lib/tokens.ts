// HMAC-SHA256-tokenin generointi ja validointi asiakkaan peruutuslinkkiä varten.
// Vaatii BOOKING_CANCEL_SECRET-ympäristömuuttujan — jos puuttuu, palautetaan null
// eikä peruutuslinkkiä lisätä sähköpostiin.

const SECRET = process.env.BOOKING_CANCEL_SECRET

async function getKey(): Promise<CryptoKey | null> {
  if (!SECRET) return null
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function generateCancelToken(bookingId: string): Promise<string | null> {
  const key = await getKey()
  if (!key) return null
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bookingId))
  return Buffer.from(sig).toString('base64url')
}

export async function verifyCancelToken(bookingId: string, token: string): Promise<boolean> {
  const key = await getKey()
  if (!key) return false
  try {
    const sigBytes = Buffer.from(token, 'base64url')
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(bookingId))
  } catch {
    return false
  }
}
