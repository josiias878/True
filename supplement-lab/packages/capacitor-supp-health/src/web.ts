import { WebPlugin } from "@capacitor/core"
import type { SuppHealthPlugin, SleepDay, HrvDay } from "./definitions"

/** Web/PWA hat keine Apple-Health- oder Health-Connect-Schnittstelle — bleibt einfach leer. */
export class SuppHealthWeb extends WebPlugin implements SuppHealthPlugin {
  async isAvailable() { return { available: false } }
  async requestPermissions() { return { granted: false } }
  async getSleep() { return { days: [] as SleepDay[] } }
  async getHrv() { return { days: [] as HrvDay[] } }
}
