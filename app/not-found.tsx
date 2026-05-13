import Link from "next/link"

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#060a06",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui,-apple-system,sans-serif",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 380 }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
        <div style={{
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          marginBottom: "0.5rem",
        }}>
          404
        </div>
        <h1 style={{
          fontSize: "1.6rem",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          marginBottom: "0.75rem",
          background: "linear-gradient(135deg, #2ECC8A, #26a870)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Seite nicht gefunden
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.88rem",
          lineHeight: 1.7,
          marginBottom: "2rem",
        }}>
          Diese Seite existiert nicht oder wurde verschoben.<br />
          Geh zurück zur App und scanne dein nächstes Produkt.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#2ECC8A",
            color: "#000",
            fontWeight: 800,
            fontSize: "0.95rem",
            padding: "0.85rem 2rem",
            borderRadius: 14,
            textDecoration: "none",
          }}
        >
          ← Zur Startseite
        </Link>
        <div style={{ marginTop: "1rem" }}>
          <Link
            href="/home"
            style={{
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
            }}
          >
            Oder direkt zur App →
          </Link>
        </div>
      </div>
    </div>
  )
}
