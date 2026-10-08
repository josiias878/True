// Kolbi anstupsen + Karten beim Scrollen einblenden
document.documentElement.classList.add("js");
(() => {
  const lines = window.KOLBI_LINES || ["Hi! 👋"]
  const b = document.getElementById("poke"), say = document.getElementById("say")
  let i = 0
  b && b.addEventListener("click", () => {
    b.classList.remove("squish"); void b.offsetWidth; b.classList.add("squish")
    if (say) { say.textContent = lines[i++ % lines.length]; say.classList.add("pop"); setTimeout(() => say.classList.remove("pop"), 300) }
    if (navigator.vibrate) navigator.vibrate(8)
  })
  // Herkunft (src) an alle Beta-Knöpfe hängen, die noch keine haben – immer genau ein gültiges src (a–z, ≤ 20):
  // Kanal-Link /reddit → reddit · /rechner → rechner · /selbsttest/magnesium → magnesium ·
  // /selbsttest/omega-3 → selbsttest · /en/self-test → selftest · Startseite (/, /en) → home
  const ok = s => /^[a-z]{1,20}$/.test(s)
  const seg = location.pathname.toLowerCase().replace(/\.html$/, "").split("/").filter(Boolean)
  if (seg[0] === "en") seg.shift()
  const last = seg[seg.length - 1] || "", first = (seg[0] || "").replace(/[^a-z]/g, "").slice(0, 20)
  const ch = !seg.length ? "home" : ok(last) ? last : ok(first) ? first : "web"
  document.querySelectorAll("a[data-cta]").forEach(a => { if (!/[?&]src=/.test(a.href)) a.href += (a.href.includes("?") ? "&" : "?") + "src=" + ch })
  // Store-Knöpfe (nur wenn in build-site.mjs STORES_ON + Links gesetzt): iPhone/iPad → App Store, Android → Google Play, sonst beide
  const st = document.getElementById("stores")
  if (st) {
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), android = /Android/.test(ua)
    if (ios || android) st.querySelectorAll("[data-store]").forEach(a => { if (a.dataset.store !== (ios ? "ios" : "android")) a.remove() })
  }
  // Schrank-Video: lädt erst, wenn es ins Bild kommt (preload="none"); fehlt die Datei, verschwindet der Rahmen
  const v = document.getElementById("schrank"), vf = document.getElementById("vidframe")
  if (v && vf) {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    // Video lässt sich nicht abspielen (fehlt / Codec): Standbild (Poster) bleibt stehen, fehlt auch das → Rahmen weg
    const gone = () => { const im = new Image(); im.onerror = () => { vf.hidden = true }; im.src = v.poster }
    v.addEventListener("error", gone)
    const start = () => { if (!v.src) { v.src = v.dataset.src; still ? (v.controls = true) : (v.autoplay = true) } if (!still) v.play().catch(() => {}) }
    if ("IntersectionObserver" in window) new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : v.pause()), { threshold: .2 }).observe(vf)
    else start()
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) } }), { threshold: .15 }) : null
  document.querySelectorAll(".reveal").forEach((el, k) => { el.style.transitionDelay = `${(k % 4) * 70}ms`; io ? io.observe(el) : el.classList.add("in") })
})()
