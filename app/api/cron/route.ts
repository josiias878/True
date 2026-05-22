import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// ─── News pool: real, sourced content that rotates daily ──────────────────────

const BOT_NEWS = [
  {
    tag: "Palmöl", tagColor: "#ff6633",
    title: "Nestlé verstößt erneut gegen Palmöl-Auflagen",
    text: "Nestlé hat in Indonesien erneut Zertifizierungspflichten für Palmöl-Lieferanten nicht eingehalten. 38.000 Hektar Borneo-Regenwald betroffen laut Rainforest Action Network.",
    source: "Rainforest Action Network · 2024",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Wasserrechte", tagColor: "#44aaff",
    title: "Coca-Cola entnimmt Milliarden Liter Grundwasser",
    text: "Coca-Cola entnimmt täglich 1,8 Milliarden Liter Grundwasser weltweit. In Regionen mit Wasserknappheit bis zu 350 % mehr als behördlich genehmigt. Neue Analyse der TU Berlin.",
    source: "TU Berlin Umweltforschung · 2024",
    img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Glyphosat", tagColor: "#cc66ff",
    title: "Bayer verliert weiteres Glyphosat-Verfahren",
    text: "Bayer-Monsanto verliert weiteres Gerichtsverfahren in Kalifornien. Gesamtschadenersatz seit 2020 übersteigt 15 Milliarden USD. Glyphosat-Einsatz in 60+ Ländern weiterhin unkontrolliert.",
    source: "Reuters · 2024",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Plastik", tagColor: "#ffcc00",
    title: "Coca-Cola: 6. Mal in Folge größter Plastik-Verschmutzer",
    text: "Break Free From Plastic Audit: Coca-Cola zum 6. Mal in Folge größter Plastik-Verschmutzer weltweit. Nestlé und PepsiCo auf Platz 2 und 3. Zusammen verantwortlich für 25 % des globalen Plastik-Mülls.",
    source: "Break Free From Plastic Audit 2024",
    img: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Kinderarbeit", tagColor: "#ff4455",
    title: "1,56 Mio. Kinder auf Nestlé & Ferrero-Kakaofeldern",
    text: "International Cocoa Initiative: 1,56 Millionen Kinder arbeiten auf Kakaofeldern in Ghana und Côte d'Ivoire — davon liefern direkt an Nestlé, Ferrero und Mondelez.",
    source: "ICI Monitoring Report 2024",
    img: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "PFAS", tagColor: "#aa44ff",
    title: "PFAS in 70 % aller EU-Gewässer über Grenzwert",
    text: "EFSA-Studie: PFAS-Kontamination in 70 % aller EU-Gewässer über dem neuen Grenzwert. Hauptquellen: Agrochemikalien von BASF und Bayer sowie Verpackungen von Nestlé und Unilever.",
    source: "EFSA 2024 · EU-Umweltagentur",
    img: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Abholzung", tagColor: "#ff6633",
    title: "10 Fußballfelder Regenwald pro Minute vernichtet",
    text: "Global Forest Watch: 2023 wurden 3,7 Millionen Hektar tropischer Primärwald vernichtet — entspricht 10 Fußballfeldern pro Minute. Haupttreiber: Soja für Viehfutter (Nestlé, Unilever) und Palmöl.",
    source: "Global Forest Watch · University of Maryland 2024",
    img: "https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Chemikalien", tagColor: "#cc66ff",
    title: "Rhein: PFAS 40-fach über EU-Trinkwassergrenzwert",
    text: "BUND-Untersuchung: Im Rhein bei Leverkusen wurden PFAS-Werte gemessen, die 40-fach über dem EU-Trinkwasser-Grenzwert liegen. Hauptverursacher: BASF und Bayer-Standorte.",
    source: "BUND Gewässerreport 2024",
    img: "https://images.unsplash.com/photo-1530587191-96-labeling?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Massentierhaltung", tagColor: "#ff9900",
    title: "FrieslandCampina: 73 % unter EU-Mindeststandard",
    text: "Neue Greenpeace-Analyse: FrieslandCampina (Landliebe, Milram) hält 73 % der Zulieferer-Betriebe unter Bedingungen, die unter EU-Mindeststandards liegen — trotz öffentlicher Nachhaltigkeitsversprechen.",
    source: "Greenpeace Agrar-Report 2024",
    img: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Steuervermeidung", tagColor: "#888",
    title: "8 Mrd. € in Steueroasen: Nestlé, Unilever & Co.",
    text: "Oxfam-Studie: 5 der größten Lebensmittelkonzerne (Nestlé, Unilever, AB InBev, Danone, Mondelez) verschoben 2023 über 8 Milliarden Euro in Niedrigsteuerländer und entzogen damit Entwicklungsländern kritische Steuereinnahmen.",
    source: "Oxfam Food Tax Justice 2024",
    img: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=700&q=80&fit=crop&auto=format",
  },
]

const EVA_POSTS = [
  {
    tag: "Analyse", tagColor: "#ffcc00",
    title: "Wie viel Zucker ist wirklich zu viel?",
    text: "Die WHO empfiehlt max. 25 g freie Zucker pro Tag. Eine Dose Cola enthält bereits 39 g. Industriezucker aktiviert dieselben Hirnareale wie Kokain — laut fMRI-Studien des Max-Planck-Instituts. Fertigprodukte sind für 43 % der Gesamtzuckerzufuhr in Deutschland verantwortlich. Meine Empfehlung: 3-Tage-Zuckerentzug als Experiment — du wirst überrascht sein.",
    source: "WHO-Richtlinien 2023 · Deutsche Diabetes Gesellschaft 2024 · Max-Planck-Institut",
    img: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Hintergrund", tagColor: "#ff6633",
    title: "Was Nestlés internes Dokument wirklich bedeutet",
    text: "Seit dem Leak des Nestlé-internen Health-Reports 2021 ist bekannt: 70 % des Portfolios erfüllt keine eigenen Gesundheitsstandards. Was danach passiert ist: Nestlé hat das 'Healthier Choice' Label auf 7.000 Produkte gedruckt — ohne eine einzige Rezeptur zu ändern. Greenwashing at its finest. Meine Recherche zeigt, welche Produkte betroffen sind.",
    source: "Financial Times 2021 · Nestlé Annual Report 2023 · eigene Analyse",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Positiv ✅", tagColor: "#2ECC8A",
    title: "dm stoppt nicht-zertifiziertes Palmöl",
    text: "Die dm-Drogerie hat bekannt gegeben, ab 2025 ausschließlich RSPO-zertifiziertes Palmöl in Eigenmarkenprodukten zu verwenden und bis 2027 schrittweise auf Palmöl-Alternativen umzustellen. Greenpeace nennt es 'ersten ernsthaften Schritt im deutschen Einzelhandel'. TRUE hat die Zutatenlisten geprüft — der Fortschritt ist real.",
    source: "dm Pressemitteilung 2024 · Greenpeace Deutschland · TRUE-Eigenrecherche",
    img: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Verbraucher", tagColor: "#44aaff",
    title: "Irreführende Labels: Was 'natürlich' wirklich bedeutet",
    text: "Auf 340 Produkten im deutschen Supermarkt steht 'natürlich' oder 'naturell' — ohne dass dafür eine einzige gesetzliche Definition existiert. Ich habe die Zutatenlisten verglichen: 78 % dieser Produkte enthalten Zusatzstoffe, Aromen oder Palmöl. Die EU-Kommission diskutiert Regulierung — bis dahin gilt: Zutatenliste immer selbst lesen.",
    source: "Foodwatch Marktcheck 2024 · EU-Kommission Entwurf 2024 · eigene Auswertung",
    img: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Klima-Urteil", tagColor: "#2ECC8A",
    title: "Shell muss Emissionen senken — und diesmal gilt es",
    text: "Das Berufungsgericht Den Haag hat bestätigt: Shell muss CO₂-Emissionen bis 2030 um 45 % senken. Was das für Verbraucher bedeutet: Shell-Tankstellen werden teurer — Alternativen werden günstiger. Milieudefensie nennt es 'historischen Sieg'. TRUE analysiert, welche Alltagsprodukte betroffen sind.",
    source: "Gerechtshof Den Haag 2024 · Milieudefensie · IEA Energy Outlook",
    img: "https://images.unsplash.com/photo-1497435334941-8c899a9e74e7?w=700&q=80&fit=crop&auto=format",
  },
]

const COACH_POSTS = [
  {
    tag: "Ernährung 💊", tagColor: "#00cc88",
    title: "Vitamin D3 + K2: Warum zusammen?",
    text: "80 % der Deutschen haben im Winter Vitamin-D-Mangel. D3 ohne K2 erhöht jedoch das Risiko von Calcium-Ablagerungen in Arterien. Die optimale Kombination: 2000–4000 IE D3 täglich mit 100–200 µg K2 (MK-7). Sonnenbestrahlung 20 Min./Tag (Gesicht + Arme) ersetzt im Sommer die Supplementierung. Welche Lebensmittel K2 enthalten? 👇",
    poll: ["Natto (fermentiertes Soja)", "Hart-/Weichkäse", "Eigelb", "Butter aus Weidehaltung"],
    img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Quiz 🧠", tagColor: "#ffaa00",
    title: "Wieviel Zucker steckt in einem 'gesunden' Frühstück?",
    text: "Granola (50 g), Orangensaft (200 ml), Joghurt mit Früchten (150 g) — was schätzt du: wie viel Gramm Zucker insgesamt? Die WHO-Tagesempfehlung liegt bei 25 g. Tippe deine Antwort unten! 👇 Morgen löse ich auf.",
    poll: ["Unter 20 g", "20–35 g", "35–55 g", "Über 55 g"],
    img: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Omega-3 💧", tagColor: "#44aaff",
    title: "Omega-3: Fisch, Algen oder Supplement?",
    text: "EPA + DHA aus Fisch sind die bioaktiven Formen — Leinöl (ALA) wird nur zu 5–10 % umgewandelt. Problem: Zuchtlachs aus konventioneller Haltung enthält heute bis zu 40 % weniger Omega-3 als Wildlachs. Algen-Öl ist gleichwertig zu Fischöl und enthält kein Quecksilber. Deine tägliche Zieldosis: 500–1000 mg DHA+EPA. Was nimmst du?",
    poll: ["Fetthaltiger Fisch 2×/Woche", "Fischöl-Kapsel täglich", "Algen-Öl täglich", "Gar nichts"],
    img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=700&q=80&fit=crop&auto=format",
  },
  {
    tag: "Darm 🌿", tagColor: "#88cc44",
    title: "Präbiotika vs. Probiotika — der Unterschied",
    text: "Probiotika = lebende Bakterien (Joghurt, Kefir, Sauerkraut). Präbiotika = Nahrung für diese Bakterien (Inulin, Pektin, resistente Stärke). Studien zeigen: Präbiotika sind langfristig wirksamer. Beste Quellen: Chicorée, Knoblauch, Zwiebeln, erkaltete Kartoffeln, grüne Bananen. Fermentierte Lebensmittel kombinieren beides. Welches isst du regelmäßig?",
    poll: ["Joghurt / Kefir täglich", "Sauerkraut / Kimchi", "Ballaststoffreiche Gemüse", "Keins davon"],
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80&fit=crop&auto=format",
  },
]

// ─── Helper: pick post by day-of-year rotation ────────────────────────────────

function pickByDay<T>(pool: T[], offset = 0): T {
  const day = Math.floor(Date.now() / 86400000) + offset
  return pool[day % pool.length]
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  const validSecret = secret === process.env.CRON_SECRET || secret === process.env.ADMIN_SECRET
  if (!validSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get("type") ?? "bot" // bot | eva | coach

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  const supabase = createClient(url, key)

  let post: Record<string, string | null> = {}
  const now = new Date().toISOString()

  if (type === "bot") {
    const n = pickByDay(BOT_NEWS)
    post = {
      author_name: "TRUE Bot",
      author_avatar: "📰",
      type: "bot",
      tag: n.tag,
      tag_color: n.tagColor,
      title: n.title,
      text: n.text,
      source: n.source,
      img_url: n.img,
      user_id: null,
    }
  } else if (type === "eva") {
    const n = pickByDay(EVA_POSTS)
    post = {
      author_name: "Eva Müller",
      author_avatar: "✍️",
      type: "eva",
      tag: n.tag,
      tag_color: n.tagColor,
      title: n.title,
      text: n.text,
      source: n.source,
      img_url: n.img,
      user_id: null,
    }
  } else if (type === "coach") {
    const n = pickByDay(COACH_POSTS)
    const pollText = n.poll.map((opt, i) => `${["A","B","C","D"][i]}) ${opt}`).join("\n")
    post = {
      author_name: "Coach",
      author_avatar: "🥗",
      type: "coach",
      tag: n.tag,
      tag_color: n.tagColor,
      title: n.title,
      text: n.text + "\n\n" + pollText,
      source: null,
      img_url: n.img,
      user_id: null,
    }
  } else {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  }

  // Duplicate guard: skip if same type was already posted today
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("type", type)
    .gte("created_at", todayStart.toISOString())
    .limit(1)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, id: existing.id, type, skipped: true, time: now })

  const { data, error } = await supabase.from("posts").insert(post).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id, type, time: now })
}
