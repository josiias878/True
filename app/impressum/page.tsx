"use client"
import Link from "next/link"

export default function ImpressumPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f0a", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Back */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2ECC8A", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", marginBottom: 32 }}>
          ← Zurück
        </Link>

        <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#2ECC8A", letterSpacing: "-0.04em", marginBottom: 8 }}>TRUE</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: "0 0 32px", letterSpacing: "-0.03em" }}>Impressum</h1>

        <Section title="Angaben gemäß § 5 TMG">
          <p>Marvin Gognon<br />
          Kantstraße 8<br />
          51379 Leverkusen (Opladen)<br />
          Deutschland</p>
        </Section>

        <Section title="Kontakt">
          <p>E-Mail: <a href="mailto:info@get-true.de" style={{ color: "#2ECC8A" }}>info@get-true.de</a></p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV">
          <p>Marvin Gognon<br />
          Kantstraße 8<br />
          51379 Leverkusen (Opladen)</p>
        </Section>

        <Section title="Hinweis zur Person">
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem", lineHeight: 1.7 }}>
            TRUE wird derzeit als privates Projekt betrieben. Eine gewerbliche Anmeldung ist in Vorbereitung.
            Alle inhaltlichen Entscheidungen trifft der oben genannte Betreiber.
          </p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem", lineHeight: 1.7 }}>
            Als Anbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
            Nach §§ 8–10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen
            zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
            Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
            Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>
        </Section>

        <Section title="Haftung für Links">
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem", lineHeight: 1.7 }}>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten
            ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt
            der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
          </p>
        </Section>

        <Section title="Urheberrecht">
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem", lineHeight: 1.7 }}>
            Die durch den Betreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.
            Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
            bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind
            nur für den privaten, nicht kommerziellen Gebrauch gestattet.
            Fotos: Pexels (lizenzfrei).
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} TRUE · <Link href="/datenschutz" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: "0.72rem", fontWeight: 700, color: "#2ECC8A", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
        {title}
      </h2>
      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  )
}
