// Muuntaa virheen turvalliseksi lokitettavaksi merkkijonoksi, jotta koko
// virheobjekti (ja sen mahdollinen arkaluontoinen sisältö) ei päädy lokiin.
// Jos virhe ei ole objekti tai odotetut kentät puuttuvat, palautetaan String(err).

export function supabaseErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown }
    if (e.message !== undefined || e.code !== undefined) {
      return `message=${String(e.message ?? '')} code=${String(e.code ?? '')}`
    }
  }
  return String(err)
}

export function resendErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { name?: unknown; message?: unknown; statusCode?: unknown }
    if (e.name !== undefined || e.message !== undefined || e.statusCode !== undefined) {
      return `name=${String(e.name ?? '')} message=${String(e.message ?? '')} statusCode=${String(e.statusCode ?? '')}`
    }
  }
  return String(err)
}

export function anthropicErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { name?: unknown; status?: unknown }
    if (e.name !== undefined || e.status !== undefined) {
      return `name=${String(e.name ?? '')} status=${String(e.status ?? '')}`
    }
  }
  return String(err)
}
