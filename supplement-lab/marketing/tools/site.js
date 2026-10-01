// Kolbi anstupsen + Karten beim Scrollen einblenden
document.documentElement.classList.add("js");
(() => {
  const lines = ["Hihi, das kitzelt! 😄", "Ich teste mit dir. 🧪", "Erst Reset, dann Test!", "Behalten oder raus? Ich zeig's dir.", "Hi, ich bin Kolbi! 👋"]
  const b = document.getElementById("poke"), say = document.getElementById("say")
  let i = 0
  b && b.addEventListener("click", () => {
    b.classList.remove("squish"); void b.offsetWidth; b.classList.add("squish")
    say.textContent = lines[i++ % lines.length]; say.classList.add("pop"); setTimeout(() => say.classList.remove("pop"), 300)
    if (navigator.vibrate) navigator.vibrate(8)
  })
  // Kanal-Link (/reddit, /tiktok …): Herkunft an die Beta-Knöpfe hängen
  const ch = location.pathname.replace(/^\/|\/$/g, "")
  if (/^[a-z]{1,20}$/.test(ch) && !["impressum", "datenschutz", "nutzungsbedingungen"].includes(ch))
    document.querySelectorAll("a[data-cta]").forEach(a => { a.href += (a.href.includes("?") ? "&" : "?") + "src=" + ch })
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) } }), { threshold: .15 }) : null
  document.querySelectorAll(".reveal").forEach((el, k) => { el.style.transitionDelay = `${(k % 4) * 70}ms`; io ? io.observe(el) : el.classList.add("in") })
})()
