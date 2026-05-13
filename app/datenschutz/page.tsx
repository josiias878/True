"use client"
import Link from "next/link"

export default function DatenschutzPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f0a", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2ECC8A", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", marginBottom: 32 }}>
          ← Zurück
        </Link>

        <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#2ECC8A", letterSpacing: "-0.04em", marginBottom: 8 }}>TRUE</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.03em" }}>Datenschutzerklärung</h1>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", marginBottom: 32 }}>Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" })}</p>

        <Section title="1. Verantwortlicher">
          <p>
            Marvin Gognon<br />
            Kantstraße 8, 51379 Leverkusen (Opladen)<br />
            E-Mail: <a href="mailto:info@get-true.de" style={{ color: "#2ECC8A" }}>info@get-true.de</a>
          </p>
        </Section>

        <Section title="2. Welche Daten wir erheben">
          <p>Bei der Nutzung von TRUE werden folgende Daten gespeichert:</p>
          <ul style={{ paddingLeft: "1.2rem", lineHeight: 2, fontSize: "0.88rem", color: "rgba(255,255,255,0.65)" }}>
            <li><strong style={{ color: "#fff" }}>E-Mail-Adresse</strong> — zur Anmeldung und Kontaktaufnahme</li>
            <li><strong style={{ color: "#fff" }}>Vorname</strong> (optional) — zur Personalisierung</li>
            <li><strong style={{ color: "#fff" }}>Geburtsdatum</strong> (optional) — für Geburtstagsbenachrichtigung</li>
            <li><strong style={{ color: "#fff" }}>Profilfoto</strong> (optional) — in Supabase Storage gespeichert</li>
            <li><strong style={{ color: "#fff" }}>Community-Beiträge</strong> — Texte und Fotos die du veröffentlichst</li>
            <li><strong style={{ color: "#fff" }}>Scan-Verlauf & Einkaufsliste</strong> — lokal auf deinem Gerät (nicht übertragen)</li>
            <li><strong style={{ color: "#fff" }}>Einstellungen & Ziele</strong> — lokal auf deinem Gerät gespeichert</li>
          </ul>
          <p style={{ marginTop: 8 }}>Zahlungsdaten, Gesundheitsdaten oder sensible persönliche Daten werden <strong>nicht</strong> erhoben.</p>
        </Section>

        <Section title="3. Zweck der Datenerhebung">
          <ul style={{ paddingLeft: "1.2rem", lineHeight: 2, fontSize: "0.88rem", color: "rgba(255,255,255,0.65)" }}>
            <li>Bereitstellung des Nutzerkontos und der App-Funktionen</li>
            <li>Darstellung von Community-Beiträgen</li>
            <li>Optionale Geburtstagsbenachrichtigung</li>
            <li>Verbesserung des Dienstes (anonym, ohne Tracking)</li>
          </ul>
          <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. a DSGVO (Einwilligung bei optionalen Daten).</p>
        </Section>

        <Section title="4. Drittanbieter & Auftragsverarbeitung">
          <p style={{ marginBottom: 12 }}>TRUE nutzt folgende externe Dienste:</p>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: 4 }}>Supabase Inc.</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
              Authentifizierung, Datenbank und Dateispeicherung. Serverstandort: EU (Frankfurt).
              Supabase verarbeitet Daten gemäß EU-Standardvertragsklauseln (SCC).<br />
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#2ECC8A" }}>supabase.com/privacy</a>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: 4 }}>STRATO AG</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
              Web-Hosting der Domain get-true.de. Serverstandort: Deutschland.<br />
              <a href="https://www.strato.de/datenschutz/" target="_blank" rel="noopener noreferrer" style={{ color: "#2ECC8A" }}>strato.de/datenschutz</a>
            </div>
          </div>
        </Section>

        <Section title="5. Cookies & lokale Speicherung">
          <p>
            TRUE verwendet <strong>keine Tracking-Cookies</strong> und kein Analytics. Daten wie Einstellungen,
            Scan-Verlauf und Einkaufsliste werden ausschließlich lokal in deinem Browser gespeichert
            (<code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4, fontSize: "0.82rem" }}>localStorage</code>).
            Diese Daten verlassen dein Gerät nicht und werden nicht an uns übertragen.
          </p>
        </Section>

        <Section title="6. Datenlöschung">
          <p>
            Du kannst dein Konto und alle zugehörigen Daten jederzeit löschen lassen.
            Schreibe dazu eine E-Mail an <a href="mailto:info@get-true.de" style={{ color: "#2ECC8A" }}>info@get-true.de</a>.
            Lokale Daten kannst du jederzeit selbst durch Leeren des Browser-Caches entfernen.
          </p>
          <p>Community-Beiträge werden auf Anfrage innerhalb von 7 Werktagen entfernt.</p>
        </Section>

        <Section title="7. Deine Rechte (DSGVO)">
          <p>Du hast jederzeit das Recht auf:</p>
          <ul style={{ paddingLeft: "1.2rem", lineHeight: 2, fontSize: "0.88rem", color: "rgba(255,255,255,0.65)" }}>
            <li><strong style={{ color: "#fff" }}>Auskunft</strong> über deine gespeicherten Daten (Art. 15)</li>
            <li><strong style={{ color: "#fff" }}>Berichtigung</strong> unrichtiger Daten (Art. 16)</li>
            <li><strong style={{ color: "#fff" }}>Löschung</strong> deiner Daten (Art. 17)</li>
            <li><strong style={{ color: "#fff" }}>Datenübertragbarkeit</strong> (Art. 20)</li>
            <li><strong style={{ color: "#fff" }}>Widerspruch</strong> gegen die Verarbeitung (Art. 21)</li>
          </ul>
          <p>
            Kontakt: <a href="mailto:info@get-true.de" style={{ color: "#2ECC8A" }}>info@get-true.de</a><br />
            Du hast auch das Recht, dich bei der zuständigen Aufsichtsbehörde zu beschweren
            (Landesbeauftragte für Datenschutz NRW: <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer" style={{ color: "#2ECC8A" }}>ldi.nrw.de</a>).
          </p>
        </Section>

        <Section title="8. Minderjährige">
          <p>
            TRUE richtet sich an Nutzer ab 13 Jahren. Wir erheben wissentlich keine Daten von
            Kindern unter 13 Jahren. Falls uns bekannt wird, dass ein Kind unter 13 Jahren
            ein Konto erstellt hat, werden die Daten umgehend gelöscht.
          </p>
        </Section>

        <Section title="9. Änderungen dieser Erklärung">
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen.
            Die jeweils aktuelle Version ist auf dieser Seite verfügbar.
            Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail informiert.
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} TRUE · <Link href="/impressum" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Impressum</Link>
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
