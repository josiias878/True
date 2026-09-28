export interface SleepDay {
  /** Kalendertag (YYYY-MM-DD, lokale Zeitzone) des Aufwachens — "letzte Nacht" zählt auf den heutigen Tag. */
  date: string
  /** Geschlafene Stunden in dieser Nacht (Summe aller Schlaf-Phasen dieses Tages). */
  hours: number
}

export interface HrvDay {
  /** Kalendertag (YYYY-MM-DD, lokale Zeitzone). */
  date: string
  /** Ø Herzratenvariabilität in Millisekunden an diesem Tag (iOS: SDNN, Android: RMSSD — beide in ms, aber nicht 1:1 zwischen Plattformen vergleichbar; innerhalb eines Geräts über Zeit aber konsistent). */
  ms: number
}

export interface SuppHealthPlugin {
  /** Ist Apple Health / Google Health Connect auf diesem Gerät überhaupt verfügbar? */
  isAvailable(): Promise<{ available: boolean }>
  /** Fragt Lesezugriff für Schlaf + HRV an (öffnet den System-Dialog). */
  requestPermissions(): Promise<{ granted: boolean }>
  /** Schlafdauer pro Tag im Bereich [startDate, endDate) (ISO-8601-Strings, UTC). */
  getSleep(options: { startDate: string; endDate: string }): Promise<{ days: SleepDay[] }>
  /** Ø HRV pro Tag im Bereich [startDate, endDate) (ISO-8601-Strings, UTC). */
  getHrv(options: { startDate: string; endDate: string }): Promise<{ days: HrvDay[] }>
}
