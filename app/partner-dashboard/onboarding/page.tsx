"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const TOTAL = 6

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]       = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [name, setName]       = useState("")

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/partner-login"); return }
      supabase!.from("partner_profiles").select("company_name")
        .eq("user_id", session.user.id).single()
        .then(({ data }) => { if (data) setName(data.company_name ?? "") })
    })
    try { if (localStorage.getItem("true-onboarding-done") === "1") router.replace("/partner-dashboard") } catch {}
  }, [])

  function advance() {
    if (leaving) return
    if (step === TOTAL - 1) {
      try { localStorage.setItem("true-onboarding-done", "1") } catch {}
      router.push("/partner-dashboard/products")
      return
    }
    setLeaving(true)
    setTimeout(() => { setStep(s => s + 1); setLeaving(false) }, 260)
  }

  function skip() {
    try { localStorage.setItem("true-onboarding-done", "1") } catch {}
    router.push("/partner-dashboard")
  }

  const pct = (step / (TOTAL - 1)) * 100

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#080f0a",
      color: "#fff",
      fontFamily: "system-ui,-apple-system,sans-serif",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes up   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pop  { 0%,100% { transform:scale(1) } 50% { transform:scale(1.06) } }
        @keyframes bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
        @keyframes glow { 0%,100% { box-shadow:0 0 30px rgba(46,204,138,.2) } 50% { box-shadow:0 0 60px rgba(46,204,138,.45) } }
        @keyframes scan { 0%,100% { top:15% } 50% { top:72% } }
        .step-in  { animation: up .3s cubic-bezier(.22,1,.36,1) forwards }
        .bob      { animation: bob 2.8s ease-in-out infinite }
        .glow     { animation: glow 2.5s ease-in-out infinite }
        .pop      { animation: pop 2s ease-in-out infinite }
        .scan-line{ animation: scan 2s ease-in-out infinite; position:absolute; left:8px; right:8px; height:2px; background:rgba(46,204,138,.7); border-radius:2px }
        .ob-btn:hover { filter:brightness(1.1); transform:translateY(-2px) }
        .ob-btn:active { transform:translateY(0) }
        .skip-lnk:hover { color:rgba(255,255,255,.5) !important }
      `}</style>

      {/* Progress */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:"rgba(255,255,255,.06)", zIndex:100 }}>
        <div style={{ height:"100%", background:"linear-gradient(90deg,#2ECC8A,#1aaa6e)", width:`${pct}%`, transition:"width .45s cubic-bezier(.4,0,.2,1)", boxShadow:"0 0 10px rgba(46,204,138,.5)" }} />
      </div>

      {/* Top row */}
      <div style={{ position:"fixed", top:14, left:18, right:18, display:"flex", alignItems:"center", justifyContent:"space-between", zIndex:100 }}>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {Array.from({length:TOTAL}).map((_,i) => (
            <div key={i} style={{ width: i===step ? 18:5, height:5, borderRadius:3, background: i<=step ? "#2ECC8A":"rgba(255,255,255,.12)", transition:"all .3s cubic-bezier(.4,0,.2,1)" }} />
          ))}
        </div>
        {step < TOTAL-1 && (
          <button onClick={skip} className="skip-lnk"
            style={{ background:"none", border:"none", color:"rgba(255,255,255,.22)", fontSize:".75rem", cursor:"pointer", fontFamily:"inherit", transition:"color .15s" }}>
            Überspringen
          </button>
        )}
      </div>

      {/* Stage */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"5rem 1.5rem 3rem", textAlign:"center",
        opacity: leaving ? 0 : 1, transform: leaving ? "translateY(14px)" : "translateY(0)",
        transition:"opacity .25s, transform .25s",
      }}>

        {/* ── 0: Willkommen ── */}
        {step === 0 && (
          <div className="step-in" style={{ maxWidth:420 }}>
            <div className="bob" style={{
              width:96, height:96, borderRadius:26, margin:"0 auto 2rem",
              background:"linear-gradient(135deg,#0f3320,#1a5030)",
              border:"1.5px solid rgba(46,204,138,.35)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"2.8rem", boxShadow:"0 20px 60px rgba(46,204,138,.15)",
            }}>🌿</div>
            <p style={{ fontSize:".7rem", fontWeight:700, color:"#2ECC8A", letterSpacing:".1em", textTransform:"uppercase", marginBottom:".6rem" }}>Willkommen</p>
            <h1 style={{ fontWeight:900, fontSize:"clamp(1.7rem,6vw,2.4rem)", letterSpacing:"-.03em", lineHeight:1.15, marginBottom:".9rem" }}>
              {name && name.length < 28 ? `Hey, ${name}!` : "Hey, schön bist du dabei!"}
            </h1>
            <p style={{ fontSize:"1rem", color:"rgba(255,255,255,.5)", lineHeight:1.7, marginBottom:"2rem" }}>
              Wir zeigen dir in 2 Minuten wie alles funktioniert.
            </p>
            <button onClick={advance} className="ob-btn" style={btn("#2ECC8A")}>Los geht's →</button>
          </div>
        )}

        {/* ── 1: Was ist TRUE ── */}
        {step === 1 && (
          <div className="step-in" style={{ maxWidth:460 }}>
            {/* Phone scan visual */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"1.5rem", marginBottom:"2.5rem" }}>
              {/* Phone */}
              <div style={{ position:"relative", width:64, height:110, background:"rgba(255,255,255,.06)", border:"1.5px solid rgba(255,255,255,.12)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                <div style={{ fontSize:"1.6rem" }}>🛒</div>
                <div className="scan-line" />
              </div>
              <div style={{ fontSize:"1.5rem", color:"rgba(255,255,255,.3)" }}>→</div>
              {/* TRUE icon */}
              <div className="glow" style={{ width:64, height:64, borderRadius:18, background:"rgba(46,204,138,.12)", border:"1.5px solid rgba(46,204,138,.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontWeight:900, fontSize:"1rem", color:"#2ECC8A" }}>TRUE</span>
              </div>
              <div style={{ fontSize:"1.5rem", color:"rgba(255,255,255,.3)" }}>→</div>
              {/* Your product */}
              <div style={{ width:64, height:64, borderRadius:18, background:"rgba(68,136,255,.1)", border:"1.5px solid rgba(68,136,255,.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem" }}>🏷️</div>
            </div>
            <h2 style={{ fontWeight:900, fontSize:"clamp(1.4rem,5vw,2rem)", letterSpacing:"-.025em", lineHeight:1.2, marginBottom:".9rem" }}>
              Nutzer scannen. Du wirst angezeigt.
            </h2>
            <p style={{ fontSize:".95rem", color:"rgba(255,255,255,.45)", lineHeight:1.7, marginBottom:"2rem" }}>
              Jemand scannt ein Produkt im Supermarkt — TRUE zeigt dein Produkt als echte Alternative.
            </p>
            <button onClick={advance} className="ob-btn" style={btn("#4488ff", "#fff")}>Weiter →</button>
          </div>
        )}

        {/* ── 2: Reichweite ── */}
        {step === 2 && (
          <div className="step-in" style={{ maxWidth:400 }}>
            <div className="pop" style={{
              fontSize:"clamp(4rem,15vw,7rem)", fontWeight:900,
              letterSpacing:"-.04em", color:"#2ECC8A",
              textShadow:"0 0 60px rgba(46,204,138,.35)",
              lineHeight:1, marginBottom:".5rem",
            }}>
              50.000+
            </div>
            <p style={{ fontSize:"1.1rem", color:"rgba(255,255,255,.55)", lineHeight:1.6, marginBottom:"0.5rem" }}>
              Nutzer suchen täglich nach besseren Produkten.
            </p>
            <p style={{ fontSize:".82rem", color:"rgba(255,255,255,.25)", marginBottom:"2.5rem" }}>
              Jede Suche ist eine Chance für dich sichtbar zu werden — kostenlos.
            </p>
            <button onClick={advance} className="ob-btn" style={btn("#2ECC8A")}>Klingt gut →</button>
          </div>
        )}

        {/* ── 3: Barcode = alles ── */}
        {step === 3 && (
          <div className="step-in" style={{ maxWidth:440 }}>
            {/* Barcode visual */}
            <div style={{ margin:"0 auto 2rem", width:160, height:80, display:"flex", alignItems:"flex-end", justifyContent:"center", gap:3 }}>
              {[7,4,9,3,7,5,4,8,6,3,9,5,7,4,8,6,4,9,5,7,3,8,6].map((h,i) => (
                <div key={i} style={{ width: i%3===0 ? 4 : 2, height:`${h*9}%`, background: i%5===0 ? "#2ECC8A" : "rgba(255,255,255,.75)", borderRadius:1 }} />
              ))}
            </div>
            <h2 style={{ fontWeight:900, fontSize:"clamp(1.4rem,5vw,2rem)", letterSpacing:"-.025em", lineHeight:1.2, marginBottom:".9rem" }}>
              Du brauchst nur den Barcode.
            </h2>
            <p style={{ fontSize:".95rem", color:"rgba(255,255,255,.45)", lineHeight:1.7, marginBottom:"2rem" }}>
              Die 13-stellige EAN-Nummer auf der Verpackung — wir verifizieren den Rest automatisch.
            </p>
            <button onClick={advance} className="ob-btn" style={btn("#2ECC8A")}>Verstanden →</button>
          </div>
        )}

        {/* ── 4: Wie einstellen ── */}
        {step === 4 && (
          <div className="step-in" style={{ maxWidth:440 }}>
            <h2 style={{ fontWeight:900, fontSize:"clamp(1.4rem,5vw,1.9rem)", letterSpacing:"-.025em", lineHeight:1.2, marginBottom:"2rem" }}>
              In 3 Klicks online.
            </h2>
            <div style={{ display:"flex", flexDirection:"column", gap:".75rem", marginBottom:"2.5rem", textAlign:"left" }}>
              {[
                { n:"1", icon:"📦", text:"\"Produkte\" in der linken Leiste anklicken" },
                { n:"2", icon:"➕", text:"\"Neues Produkt\" klicken" },
                { n:"3", icon:"🔢", text:"Barcode eingeben — fertig!" },
              ].map(item => (
                <div key={item.n} style={{
                  display:"flex", alignItems:"center", gap:"1rem",
                  background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
                  borderRadius:14, padding:".9rem 1rem",
                }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(46,204,138,.12)", border:"1px solid rgba(46,204,138,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#2ECC8A", fontSize:".85rem", flexShrink:0 }}>
                    {item.n}
                  </div>
                  <span style={{ fontSize:".88rem", color:"rgba(255,255,255,.7)" }}>
                    <span style={{ marginRight:6 }}>{item.icon}</span>{item.text}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={advance} className="ob-btn" style={btn("#2ECC8A")}>Super, los! →</button>
          </div>
        )}

        {/* ── 5: Fertig ── */}
        {step === 5 && (
          <div className="step-in" style={{ maxWidth:400 }}>
            <div className="glow" style={{
              width:88, height:88, borderRadius:"50%", margin:"0 auto 2rem",
              background:"linear-gradient(135deg,#2ECC8A,#1aaa6e)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"2.5rem",
            }}>✓</div>
            <h2 style={{ fontWeight:900, fontSize:"clamp(1.7rem,6vw,2.4rem)", letterSpacing:"-.03em", lineHeight:1.15, marginBottom:".9rem" }}>
              Du bist bereit!
            </h2>
            <p style={{ fontSize:".95rem", color:"rgba(255,255,255,.45)", lineHeight:1.7, marginBottom:"2.5rem" }}>
              Stell jetzt dein erstes Produkt ein — es dauert weniger als 3 Minuten.
            </p>
            <button onClick={advance} className="ob-btn" style={btn("#2ECC8A")}>
              Erstes Produkt einreichen →
            </button>
            <button onClick={skip} className="skip-lnk"
              style={{ display:"block", margin:".85rem auto 0", background:"none", border:"none", color:"rgba(255,255,255,.22)", fontSize:".75rem", cursor:"pointer", fontFamily:"inherit", transition:"color .15s" }}>
              Erst mal Dashboard ansehen
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function btn(bg: string, color = "#000"): React.CSSProperties {
  return {
    background: `linear-gradient(135deg,${bg},${bg}bb)`,
    color, border:"none", borderRadius:14,
    padding:".95rem 2.5rem", fontWeight:900, fontSize:".95rem",
    cursor:"pointer", fontFamily:"inherit",
    boxShadow:`0 8px 28px ${bg}28`,
    transition:"filter .15s, transform .15s",
    letterSpacing:"-.01em",
  }
}
