import { registerPlugin } from "@capacitor/core"
import type { SuppHealthPlugin } from "./definitions"

const SuppHealth = registerPlugin<SuppHealthPlugin>("SuppHealth", {
  web: () => import("./web").then(m => new m.SuppHealthWeb()),
})

export * from "./definitions"
export { SuppHealth }
