// Kaikki aikavyöhyketietoinen päivämäärälogiikka kootusti.
// Käytetään kalenterissa, TimeSlotPickerissä ja slots-API:ssa.

const TZ = 'Europe/Helsinki'

/**
 * Palauttaa tämän päivän päivämäärän muodossa YYYY-MM-DD Helsingin ajassa.
 */
export function todayHelsinki(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

/**
 * Muuntaa Date-objektin YYYY-MM-DD -merkkijonoksi Helsingin ajassa.
 * sv-SE-locale tuottaa aina YYYY-MM-DD -muodon.
 */
export function toDateStrHelsinki(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ })
}

/**
 * Palauttaa seuraavat N arkipäivää (ma–la, ei sunnuntaita) YYYY-MM-DD -merkkijonoina
 * Helsingin ajassa. Aloittaa huomisesta.
 */
export function nextDaysHelsinki(n: number): string[] {
  const days: string[] = []
  // Käytetään puoltapäivää UTC-ankkurina — vältetään kesäajan vaihtoon liittyvät
  // reunatapaukset, koska puolipäivä UTC = 15:00 Helsinki, joka on sama kalenteripäivä.
  const cursor = new Date(todayHelsinki() + 'T12:00:00Z')

  while (days.length < n) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const dateStr = toDateStrHelsinki(cursor)
    // Tarkistetaan viikonpäivä UTC-puolipäivällä (sama Helsingin päivä)
    if (cursor.getUTCDay() !== 0) { // 0 = sunnuntai
      days.push(dateStr)
    }
  }
  return days
}

/**
 * Muuntaa Helsingin paikallisen päivämäärän + ajan UTC Date-objektiksi.
 * Toimii oikein sekä talvi- (UTC+2) että kesäajalla (UTC+3).
 *
 * Esim. helsinkiToUTC('2026-04-08', '09:00') → 2026-04-08T06:00:00.000Z
 */
export function helsinkiToUTC(dateStr: string, timeStr: string): Date {
  // Luodaan "väärä" UTC-päivä syötearvoilla
  const fakeUTC = new Date(`${dateStr}T${timeStr}:00Z`)

  // Mitä Helsinki-aika näyttää tälle UTC-ajalle?
  const helsinkiRepr = fakeUTC.toLocaleString('sv-SE', { timeZone: TZ })
  // sv-SE locale antaa "YYYY-MM-DD HH:MM:SS" -muodon
  const gotAsUTC = new Date(helsinkiRepr.replace(' ', 'T') + 'Z')

  // Siirtymä: haluamamme - saamamme = kuinka paljon siirretään
  const diff = fakeUTC.getTime() - gotAsUTC.getTime()

  return new Date(fakeUTC.getTime() + diff)
}

/**
 * Muotoilee ISO-aikaleiman kellonajaksi (HH:MM) Helsingin ajassa.
 */
export function formatTimeHelsinki(iso: string): string {
  return new Date(iso).toLocaleTimeString('fi-FI', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Muotoilee ISO-aikaleiman päivämääräksi + kellonaiksi Helsingin ajassa.
 * short: "ti 8.4. 09:00" | long: "tiistai 8. huhtikuuta 09:00"
 */
export function formatDateTimeHelsinki(
  iso: string,
  style: 'short' | 'long' = 'short'
): string {
  return new Date(iso).toLocaleDateString('fi-FI', {
    timeZone: TZ,
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Muotoilee YYYY-MM-DD -merkkijonon lyhyeksi suomalaiseksi päiväksi, esim. "ti 8.4."
 */
export function formatDayHelsinki(dateStr: string): string {
  // Puolipäivä UTC ankkurina — oikea Helsingin päivä
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('fi-FI', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  })
}
