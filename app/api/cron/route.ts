import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// ─── Journalist Personas ──────────────────────────────────────────────────────
const JOURNALISTS = {
  eva:    { name: "Julia",  avatar: "✍️", title: "Allgemeine Redaktion" },
  markus: { name: "Markus", avatar: "⚡", title: "Sportwissenschaftler" },
  sara:   { name: "Sara",   avatar: "🥗", title: "Ernährungsberaterin" },
  tom:    { name: "Tom",    avatar: "📋", title: "Verbraucherschutz" },
}

type JType = keyof typeof JOURNALISTS

// ─── Julia (eva) — Allgemeine Redaktion / Konzerne & Positives ───────────────
const EVA_POSTS = [
  {
    sentiment: "negative",
    tag: "Kinderarbeit", tagColor: "#ff4455",
    title: "1,56 Mio. Kinder auf Nestlé & Ferrero-Kakaofeldern",
    text: "International Cocoa Initiative: 1,56 Millionen Kinder arbeiten auf Kakaofeldern in Ghana und Côte d'Ivoire — davon liefern die meisten direkt an Nestlé, Ferrero und Mondelez. Durchschnittslohn der Eltern: unter 1 € pro Tag. Ich habe die Lieferketten geprüft — die Konzerne wissen es seit Jahren.",
    source: "ICI Monitoring Report 2024 · Reuters Investigativ",
    img: "https://images.pexels.com/photos/1352249/pexels-photo-1352249.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Greenwashing", tagColor: "#ff6633",
    title: "Unilever vermarktet Plastik als 'nachhaltig' — Werberat stoppt Kampagne",
    text: "Der britische Advertising Standards Authority hat Unilever verurteilt: Dove, Hellmann's und Knorr wurden als 'nachhaltig' beworben, ohne einen einzigen belegbaren Nachweis. Meine Recherche zeigt: Diese Praxis läuft in 14 EU-Ländern gleichzeitig — unkontrolliert.",
    source: "Advertising Standards Authority UK · 2024 · eigene Analyse",
    img: "https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Steuervermeidung", tagColor: "#888",
    title: "8 Mrd. € in Steueroasen: Nestlé, Unilever & Co.",
    text: "Oxfam-Studie: Nestlé, Unilever, AB InBev, Danone und Mondelez verschoben 2023 über 8 Milliarden Euro in Niedrigsteuerländer. Das entzieht Entwicklungsländern Steuereinnahmen, die dort dringend für Infrastruktur gebraucht werden. Nestlé-CEO verdiente dabei 14,4 Mio. CHF.",
    source: "Oxfam Food Tax Justice 2024 · Nestlé Annual Report 2023",
    img: "https://images.pexels.com/photos/1602726/pexels-photo-1602726.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Palmöl", tagColor: "#ff6633",
    title: "Nestlé verstößt erneut gegen Palmöl-Auflagen in Borneo",
    text: "Nestlé hat in Indonesien erneut Zertifizierungspflichten für Palmöl-Lieferanten nicht eingehalten. 38.000 Hektar Primärwald auf Borneo betroffen — Lebensraum des Orang-Utans. Das Unternehmen hat dieselbe Zusage bereits 2010 und 2018 gebrochen.",
    source: "Rainforest Action Network · 2024",
    img: "https://images.pexels.com/photos/975250/pexels-photo-975250.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Arbeitsbedingungen", tagColor: "#ffcc00",
    title: "Mars zahlt Kakaobauern 0,87 € pro Tag",
    text: "Mars Inc. (Snickers, M&M's, Pedigree) gibt sich fair — doch Kakaobauern in Ghana erhalten im Schnitt 0,87 € pro Tag. Oxfam bezeichnet die Lieferkette als 'systematisch ausbeuterisch'. Meine Anfrage an Mars blieb unbeantwortet.",
    source: "Oxfam Schokoladenbericht 2025 · Fairtrade International",
    img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "positive",
    tag: "Positive Entwicklung ✅", tagColor: "#2ECC8A",
    title: "dm stoppt nicht-zertifiziertes Palmöl — ein echter Schritt",
    text: "dm hat bekannt gegeben, ab 2025 ausschließlich RSPO-zertifiziertes Palmöl in Eigenmarkenprodukten zu verwenden und bis 2027 schrittweise auf Palmöl-Alternativen umzustellen. Greenpeace nennt es 'ersten ernsthaften Schritt im deutschen Einzelhandel'.",
    source: "dm Pressemitteilung 2024 · Greenpeace Deutschland",
    img: "https://images.pexels.com/photos/1303081/pexels-photo-1303081.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "positive",
    tag: "Positive Entwicklung ✅", tagColor: "#2ECC8A",
    title: "EU verbietet Mikroplastik in 17 Produktkategorien ab 2025",
    text: "Die EU-Kommission hat ein weitreichendes Verbot von absichtlich zugesetztem Mikroplastik beschlossen. Ab 2025 betrifft es 17 Produktkategorien — darunter Kosmetik, Reinigungsmittel und Dünger. Schätzung: 500.000 Tonnen Mikroplastik werden pro Jahr verhindert.",
    source: "EU-Kommission Verordnung 2023/2055 · EEA 2024",
    img: "https://images.pexels.com/photos/2547565/pexels-photo-2547565.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "positive",
    tag: "Positive Entwicklung ✅", tagColor: "#2ECC8A",
    title: "Rewe listet 200+ neue Bio-Eigenmarken — ohne Aufpreis",
    text: "Rewe hat angekündigt, bis Ende 2025 über 200 konventionelle Eigenmarkenprodukte durch Bio-zertifizierte Alternativen zum gleichen Preis zu ersetzen. Hintergrund: Preisparität ist laut Studie der wichtigste Treiber für nachhaltige Kaufentscheidungen.",
    source: "Rewe Group Pressemitteilung 2024 · GfK Konsumentenstudie 2024",
    img: "https://images.pexels.com/photos/1580466/pexels-photo-1580466.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "positive",
    tag: "Forschung ✅", tagColor: "#2ECC8A",
    title: "Pflanzliche Ernährung senkt Herzrisiko um 32 % — neue Metaanalyse",
    text: "Eine neue Metaanalyse aus 30 Studien mit 500.000 Teilnehmern bestätigt: Eine überwiegend pflanzliche Ernährung senkt das Herzerkrankungsrisiko um 32 %, Typ-2-Diabetes um 23 %. Entscheidend ist nicht 'vegan oder nicht', sondern der hohe Anteil an Hülsenfrüchten, Vollkorn und Gemüse.",
    source: "European Heart Journal 2024 · Harvard T.H. Chan School of Public Health",
    img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "positive",
    tag: "Positive Entwicklung ✅", tagColor: "#2ECC8A",
    title: "Deutschland reduziert Lebensmittelverschwendung um 12 %",
    text: "Bundesministerium für Ernährung: Deutschland hat 2023 die Lebensmittelverschwendung um 12 % gegenüber 2020 reduziert — 1,4 Millionen Tonnen weniger. Treiber: Kochbox-Dienste, Resteverwertungs-Apps und veränderte Einkaufsgewohnheiten.",
    source: "BMEL Lebensmittelverschwendungs-Report 2024 · WWF Deutschland",
    img: "https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
]

// ─── Markus — Sportwissenschaftler ───────────────────────────────────────────
const MARKUS_POSTS = [
  {
    sentiment: "nutrition",
    tag: "Sportnahrung", tagColor: "#fb923c",
    title: "Protein-Shakes: Was Hersteller verschweigen",
    text: "60 % der meistverkauften Protein-Shakes in Deutschland enthalten Zusatzstoffe, die bei regelmäßigem Konsum kritisch bewertet werden: Aspartam, Acesulfam-K, Carrageen. Mein Tipp als Sportwissenschaftler: 200 g Magerquark liefern dieselbe Proteinmenge ohne Zusätze — zu einem Bruchteil des Preises.",
    source: "Stiftung Warentest Proteinprodukte 2024 · EFSA Zusatzstoffe-Review",
    img: "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "neutral",
    tag: "Regeneration", tagColor: "#44aaff",
    title: "Schlaf schlägt jedes Supplement — die Forschung ist eindeutig",
    text: "Matthew Walker (Universität Berkeley): 7–9 Stunden Schlaf steigern die Muskelregeneration um 40 % gegenüber 6 Stunden. Wachstumshormon-Ausschüttung erfolgt zu 80 % im Tiefschlaf. Kein Kreatin-Supplement der Welt kann das ersetzen. Wer wenig schläft, trainiert gegen seinen eigenen Körper.",
    source: "Matthew Walker: Why We Sleep · Journal of Sleep Research 2024",
    img: "https://images.pexels.com/photos/3820380/pexels-photo-3820380.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "nutrition",
    tag: "Zucker im Sport", tagColor: "#ffaa00",
    title: "Energy Drinks im Sport: Kurzfristig up, langfristig down",
    text: "Red Bull, Monster und Co. steigern kurzfristig die Leistung durch Koffein — das ist wissenschaftlich belegt. Das Problem: Der Zuckergehalt (27–34 g pro Dose) führt zu Insulinspitzen und einem Leistungsabfall 45–60 Minuten nach dem Konsum. Bessere Alternative: schwarzer Kaffee + Banane.",
    source: "British Journal of Sports Medicine 2024 · DGE Sporternährung",
    img: "https://images.pexels.com/photos/5591661/pexels-photo-5591661.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "nutrition",
    tag: "Muskeln & Ernährung", tagColor: "#fb923c",
    title: "Wie viel Protein braucht man wirklich?",
    text: "Die DGE empfiehlt 0,8 g/kg Körpergewicht — das gilt für Inaktive. Für Kraftsport optimal: 1,6–2,0 g/kg. Mehr bringt keinen Mehrwert, belastet aber Nieren und Geldbeutel. Hochwertige Quellen: Hülsenfrüchte, Eier, Magerquark, Hühnchen — kein teures Pulver nötig.",
    source: "International Society of Sports Nutrition 2024 · DGE",
    img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "positive",
    tag: "Bewegung ✅", tagColor: "#2ECC8A",
    title: "30 Minuten täglich: Wie viel Sport wirklich nötig ist",
    text: "WHO-Empfehlung: 150 Minuten moderate Bewegung pro Woche reichen, um das Herzerkrankungsrisiko um 35 % zu senken. Das sind 21 Minuten täglich — kein Fitnessstudio nötig. Spazierengehen, Radfahren, Treppensteigen zählen vollständig. Die beste Sportart: die, die du regelmäßig machst.",
    source: "WHO Physical Activity Guidelines 2023 · Lancet Global Health",
    img: "https://images.pexels.com/photos/3775566/pexels-photo-3775566.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
]

// ─── Sara — Ernährungsberaterin ───────────────────────────────────────────────
const SARA_POSTS = [
  {
    sentiment: "nutrition",
    tag: "Zucker", tagColor: "#ffaa00",
    title: "Wie viel Zucker ist wirklich zu viel?",
    text: "Die WHO empfiehlt max. 25 g freie Zucker pro Tag. Eine Dose Cola enthält bereits 39 g. Industriezucker aktiviert laut Max-Planck-Institut dieselben Hirnareale wie Kokain. Fertigprodukte verantworten 43 % der deutschen Zuckerzufuhr. Als Ernährungsberaterin empfehle ich: 3-Tage-Entzug — du wirst überrascht sein.",
    source: "WHO 2023 · Deutsche Diabetes Gesellschaft 2024 · Max-Planck-Institut",
    img: "https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "nutrition",
    tag: "Omega-3", tagColor: "#44aaff",
    title: "Fisch, Algen oder Supplement — was wirklich hilft",
    text: "EPA + DHA aus Fisch sind die bioaktiven Formen. Leinöl (ALA) wird nur zu 5–10 % umgewandelt. Problem: Zuchtlachs enthält heute bis zu 40 % weniger Omega-3 als Wildlachs (TU München 2024). Algen-Öl ist gleichwertig — und enthält kein Quecksilber. Meine Empfehlung für Vegetarier.",
    source: "TU München 2024 · EFSA Omega-3 Bewertung · Nutrients Journal",
    img: "https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "nutrition",
    tag: "Darmgesundheit", tagColor: "#88cc44",
    title: "Präbiotika vs. Probiotika — der entscheidende Unterschied",
    text: "Probiotika = lebende Bakterien (Joghurt, Kefir, Sauerkraut). Präbiotika = Nahrung für diese Bakterien. Laut aktuellen Studien sind Präbiotika langfristig wirksamer. Beste Quellen: Chicorée, Knoblauch, erkaltete Kartoffeln, grüne Bananen.",
    source: "Nature Medicine 2024 · DGNM Leitlinien · Cell Host & Microbe",
    img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "nutrition",
    tag: "Vitamin D", tagColor: "#ffcc00",
    title: "Vitamin D3 + K2: Warum immer zusammen?",
    text: "80 % der Deutschen haben im Winter Vitamin-D-Mangel. D3 ohne K2 erhöht das Risiko von Calcium-Ablagerungen in Arterien. Optimale Kombination: 2000–4000 IE D3 täglich mit 100–200 µg K2 (MK-7). Im Sommer ersetzen 20 Min. Sonne auf Gesicht und Armen die Supplementierung vollständig.",
    source: "Robert Koch-Institut 2024 · EFSA D3/K2 Review · Journal of Nutrition",
    img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "nutrition",
    tag: "Ultra-processed", tagColor: "#ff6633",
    title: "NOVA 4: Was Ultra-Processed Food mit dem Körper macht",
    text: "Ultra-verarbeitete Lebensmittel machen 46 % der deutschen Kalorienzufuhr aus. Laut Lancet 2024 erhöhen sie das Risiko für Typ-2-Diabetes um 53 %, für Herzerkrankungen um 32 %. Erkennungszeichen: mehr als 5 Zutaten, Aromen, Farbstoffe, Emulgatoren.",
    source: "The Lancet 2024 · NOVA Food Classification · DGE",
    img: "https://images.pexels.com/photos/1128678/pexels-photo-1128678.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
]

// ─── Tom — Verbraucherschutz ──────────────────────────────────────────────────
const TOM_POSTS = [
  {
    sentiment: "negative",
    tag: "Irreführung", tagColor: "#cc66ff",
    title: "'Natürlich' auf 340 Produkten — ohne jede Rechtsgrundlage",
    text: "Auf 340 Produkten im deutschen Supermarkt steht 'natürlich' oder 'naturell' — ohne dass dafür eine gesetzliche Definition existiert. 78 % dieser Produkte enthalten Zusatzstoffe, Aromen oder Palmöl. Die EU-Kommission diskutiert Regulierung — bis dahin: immer selbst die Zutatenliste lesen.",
    source: "Foodwatch Marktcheck 2024 · EU-Kommission Entwurf 2024",
    img: "https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Kindermarketing", tagColor: "#cc66ff",
    title: "2 Mrd. € jährlich für Kinder-Werbung von Ultra-processed Food",
    text: "Nestlé, Unilever und Mondelez geben gemeinsam über 2 Milliarden € jährlich für Kindermarketing aus — davon 68 % für Ultra-Processed Food (NOVA 4). Laut Lancet direkt verknüpft mit dem Anstieg von Kinderübergewicht in Europa.",
    source: "The Lancet · WHO Marketingbericht 2025 · BEUC",
    img: "https://images.pexels.com/photos/1128678/pexels-photo-1128678.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Zusatzstoffe", tagColor: "#ff7700",
    title: "Red Bull: 7 umstrittene Zusatzstoffe — EFSA warnt",
    text: "Red Bull enthält 7 Lebensmittelzusatzstoffe, die in der EU zulässig, aber wissenschaftlich umstritten sind. Für Kinder unter 12 Jahren empfiehlt die EFSA ausdrücklich keinen Konsum. In Deutschland trinken laut Studie 14 % der 10–14-Jährigen regelmäßig Energy Drinks.",
    source: "EFSA Bewertung Energydrinks 2024 · DAK Gesundheitsreport",
    img: "https://images.pexels.com/photos/5591661/pexels-photo-5591661.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "neutral",
    tag: "Analyse", tagColor: "#44aaff",
    title: "Was Nestlés internes Dokument wirklich bedeutet",
    text: "Seit dem Leak des Nestlé-internen Health-Reports 2021 ist bekannt: 70 % des Portfolios erfüllt keine eigenen Gesundheitsstandards. Danach hat Nestlé das 'Healthier Choice' Label auf 7.000 Produkte gedruckt — ohne eine einzige Rezeptur zu ändern. Ich zeige dir, welche Produkte betroffen sind.",
    source: "Financial Times 2021 · Nestlé Annual Report 2023 · eigene Analyse",
    img: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    sentiment: "negative",
    tag: "Glyphosat", tagColor: "#cc66ff",
    title: "Bayer verliert weiteres Glyphosat-Verfahren — 15 Mrd. Schadenersatz",
    text: "Bayer-Monsanto verliert weiteres Gerichtsverfahren in Kalifornien. Gesamtschadenersatz seit 2020 übersteigt 15 Milliarden USD. Glyphosat ist in 60+ Ländern weiterhin unkontrolliert im Einsatz — und in 32 % der deutschen Getreideproben nachweisbar.",
    source: "Reuters 2024 · BVL Rückstandsmonitoring 2024",
    img: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
]

// ─── All posts pool ───────────────────────────────────────────────────────────
const ALL_POSTS = [
  ...EVA_POSTS.map(p => ({ ...p, journalist: "eva" as JType })),
  ...MARKUS_POSTS.map(p => ({ ...p, journalist: "markus" as JType })),
  ...SARA_POSTS.map(p => ({ ...p, journalist: "sara" as JType })),
  ...TOM_POSTS.map(p => ({ ...p, journalist: "tom" as JType })),
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

  const type = req.nextUrl.searchParams.get("type") ?? "daily"

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  const supabase = createClient(url, key)
  const now = new Date().toISOString()

  // ── Seed-Modus: erste Posts für alle Journalisten eintragen ──────────────────
  if (type === "seed") {
    const results: { type: string; status: string; title?: string }[] = []
    const journalistKeys: JType[] = ["markus", "sara", "tom", "eva"]

    for (const jKey of journalistKeys) {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("type", jKey)

      if ((count ?? 0) > 0) {
        results.push({ type: jKey, status: "skipped — already has posts" })
        continue
      }

      const pool = ALL_POSTS.filter(p => p.journalist === jKey)
      if (pool.length === 0) { results.push({ type: jKey, status: "no posts defined" }); continue }

      const post = pool[0]
      const journalist = JOURNALISTS[jKey]

      const { error } = await supabase.from("posts").insert({
        type: jKey,
        author_name: journalist.name,
        author_avatar: journalist.avatar,
        tag: post.tag,
        tag_color: post.tagColor,
        title: post.title,
        text: post.text,
        source: post.source,
        img_url: post.img,
        user_id: null,
      })

      if (error) {
        results.push({ type: jKey, status: `error: ${error.message}` })
      } else {
        results.push({ type: jKey, status: "inserted", title: post.title })
      }
    }

    return NextResponse.json({ ok: true, seed: results, time: now })
  }

  // ── Täglicher Post (rotiert durch alle Journalisten) ─────────────────────────
  const picked = pickByDay(ALL_POSTS)
  const journalist = JOURNALISTS[picked.journalist]

  const post: Record<string, string | null> = {
    type: picked.journalist,
    author_name: journalist.name,
    author_avatar: journalist.avatar,
    tag: picked.tag,
    tag_color: picked.tagColor,
    title: picked.title,
    text: picked.text,
    source: picked.source,
    img_url: picked.img,
    user_id: null,
  }

  // Duplicate guard: skip if already posted today
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .gte("created_at", todayStart.toISOString())
    .not("type", "in", '("user")')
    .limit(1)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, id: existing.id, type, skipped: true, time: now })

  const { data, error } = await supabase.from("posts").insert(post).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id, journalist: journalist.name, sentiment: picked.sentiment, time: now })
}
