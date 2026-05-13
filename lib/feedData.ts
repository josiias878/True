// Shared feed data — imported by feed page and channel pages

export interface FeedPost {
  id: number
  type: string
  avatar: string
  name: string
  time: string
  createdAt?: number
  tag: string
  tagColor: string
  text: string
  likes: number
  comments?: number
  img?: string | null
  source?: string
  badge?: string
  title?: string
  isExample?: boolean
  location?: string
  user_id?: string
}

const _T = Date.now()

export const ALL_BOT_POSTS: FeedPost[] = [
  { id: 1, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 8 * 60_000, tag: "Palmöl", tagColor: "#ff6633", text: "Nestlé hat in Indonesien erneut Zertifizierungspflichten für Palmöl-Lieferanten nicht eingehalten. 38.000 Hektar Borneo-Regenwald betroffen laut Rainforest Action Network.", source: "Rainforest Action Network · 2026", likes: 0, img: "https://images.pexels.com/photos/975250/pexels-photo-975250.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 4, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 18 * 60_000, tag: "Palmöl", tagColor: "#ff6633", text: "Ferrero (Nutella, Kinder) ist der weltweit drittgrößte Palmöl-Käufer. Trotz öffentlicher Versprechen bezieht das Unternehmen laut Greenpeace 2024 noch immer Palmöl aus Gebieten mit aktiver Abholzung in Borneo.", source: "Greenpeace Palmöl-Report 2024", likes: 0, img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 5, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 35 * 60_000, tag: "Palmöl", tagColor: "#ff6633", text: "Für jedes Kilogramm Palmöl werden durchschnittlich 1,3 m² Regenwald gerodet. 2023 waren es insgesamt 840.000 Hektar — allein durch die Top 10 Lebensmittelkonzerne. Das entspricht der Fläche von Schleswig-Holstein.", source: "Science Magazine 2024 · WWF Regenwald-Report", likes: 0, img: "https://images.pexels.com/photos/1128678/pexels-photo-1128678.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 2, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 44 * 60_000, tag: "Wasserrechte", tagColor: "#44aaff", text: "Coca-Cola entnimmt täglich 1,8 Milliarden Liter Grundwasser — in Gebieten mit Wasserknappheit bis zu 350 % mehr als genehmigt. TU Berlin: In 6 Ländern Südostasiens hat das direkte Folgen für die Trinkwasserversorgung.", source: "TU Berlin Umweltforschung · 2026", likes: 0, img: "https://images.pexels.com/photos/2893555/pexels-photo-2893555.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 6, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 55 * 60_000, tag: "Wasserrechte", tagColor: "#44aaff", text: "Nestlé Waters hat über 27 Jahre lang ohne gültige Genehmigung Wasser aus dem San Bernardino National Forest in Kalifornien entnommen. US Forest Service leitete 2021 Untersuchungsverfahren ein. Über 50 Millionen Liter betroffen.", source: "US Forest Service · CNN Investigativ 2021", likes: 0, img: "https://images.pexels.com/photos/247763/pexels-photo-247763.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 7, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 70 * 60_000, tag: "Wasserrechte", tagColor: "#44aaff", text: "PepsiCo (Lay's, Pepsi, Gatorade) hat in Indien und Mexiko mehrfach lokale Wasserquellen überbeansprucht. Laut WHO fehlt 3 Milliarden Menschen sicheres Trinkwasser — während Konzerne unreguliert Quellen ausbeuten.", source: "WHO Wasserknappheit-Report 2024 · Corporate Water Accountability Network", likes: 0, img: "https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 3, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 90 * 60_000, tag: "Glyphosat", tagColor: "#cc66ff", text: "Bayer-Monsanto verliert weiteres Gerichtsverfahren in Kalifornien. Schadensersatz: 2,25 Milliarden USD. Glyphosat-Einsatz in über 60 Ländern weiterhin ohne ausreichende Regulierung.", source: "Reuters · 2026", likes: 0, img: "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 8, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 110 * 60_000, tag: "Glyphosat", tagColor: "#cc66ff", text: "Neue Metastudie in Environmental Health Perspectives: Kinder mit hoher Glyphosat-Exposition haben 41 % erhöhtes Risiko für Non-Hodgkin-Lymphom. Roundup ist in Deutschland noch bis 2028 zugelassen.", source: "Environmental Health Perspectives 2024 · IARC Gruppe 2A", likes: 0, img: "https://images.pexels.com/photos/1143754/pexels-photo-1143754.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 9, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 130 * 60_000, tag: "Chemie", tagColor: "#aa66ff", text: "PFAS (Ewigkeits-Chemikalien) wurden in 70 % aller Gewässer der EU nachgewiesen. P&G (Ariel, Pampers) und 3M zählen zu den Hauptverursachern. EU-Beschränkung erst 2026 geplant — zu spät für betroffene Regionen.", source: "EEA Gewässer-Monitoring 2024 · ECHA Chemikalienregister", likes: 0, img: "https://images.pexels.com/photos/2346165/pexels-photo-2346165.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 10, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 150 * 60_000, tag: "Plastik", tagColor: "#ff8844", text: "Coca-Cola ist seit 6 Jahren in Folge der weltgrößte Plastik-Verschmutzer laut Break Free From Plastic Audit. 2023: über 2,4 Millionen Plastikteile mit Coca-Cola-Logo bei globalen Säuberungsaktionen gefunden.", source: "Break Free From Plastic Audit 2023 · Greenpeace", likes: 0, img: "https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 11, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 170 * 60_000, tag: "Zucker", tagColor: "#ffcc00", text: "Ultra-verarbeitete Lebensmittel (NOVA Gruppe 4) machen in Deutschland 46 % aller Kalorien bei Kindern aus. Nestlé, Unilever und Mars Food stellen 68 % dieser Produkte her. Zusammenhang mit Adipositas und Typ-2-Diabetes belegt.", source: "Deutsche Gesellschaft für Ernährung 2024 · NOVA Klassifikation", likes: 0, img: "https://images.pexels.com/photos/1352249/pexels-photo-1352249.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 12, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 190 * 60_000, tag: "Tierhaltung", tagColor: "#ff5544", text: "Nur 4,7 % aller Milchkühe in Deutschland haben Weidegang. FrieslandCampina (Milram, Landliebe) und Müller-Gruppe halten 80 % ihrer Zulieferer-Betriebe ohne Zugang zu Grünland. Greenpeace Milch-Report 2024.", source: "Greenpeace Milch-Report 2024 · Albert Schweitzer Stiftung", likes: 0, img: "https://images.pexels.com/photos/422170/pexels-photo-422170.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 13, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 210 * 60_000, tag: "Kinderarbeit", tagColor: "#ff3355", text: "Laut US-Arbeitsministerium arbeiten in der westafrikanischen Kakaoindustrie schätzungsweise 1,56 Millionen Kinder. Nestlé (KitKat) und Mars (Snickers, Bounty) haben ihre Selbstverpflichtungen zur Abschaffung mehrfach nicht eingehalten.", source: "US Department of Labor · Fairtrade International 2024", likes: 0, img: "https://images.pexels.com/photos/918327/pexels-photo-918327.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 14, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 230 * 60_000, tag: "Greenwashing", tagColor: "#88cc44", text: "Unilever, P&G und Nestlé wurden vom britischen ASA wegen irreführender Nachhaltigkeitsversprechen auf Verpackungen abgemahnt. Begriffe wie 'nachhaltig', '100% natürlich' oder 'klimaneutral' wurden ohne Belege verwendet.", source: "UK Advertising Standards Authority 2024 · ClientEarth", likes: 0, img: "https://images.pexels.com/photos/3025564/pexels-photo-3025564.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 15, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 250 * 60_000, tag: "Steuern", tagColor: "#ffaa00", text: "Amazon zahlte 2022 effektiv 0,9 % Steuern auf EU-Gewinne von 35 Mrd. €. Nestlé, Google und LVMH nutzen Luxemburg als Steueroase. Die EU Tax Gap Report schätzt, dass Konzerne jährlich 160 Mrd. € an Steuern in der EU vermeiden.", source: "EU Tax Observatory 2023 · Tax Justice Network", likes: 0, img: "https://images.pexels.com/photos/164686/pexels-photo-164686.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 16, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 270 * 60_000, tag: "Arbeit", tagColor: "#cc6600", text: "Amazon-Lagerarbeiter haben laut OSHA eine doppelt so hohe Verletzungsrate wie der Branchendurchschnitt. In deutschen Logistikzentren von Zalando wurden 2024 Überstunden über das gesetzliche Limit dokumentiert. Gleichzeitig blockierten beide Unternehmen Betriebsratsgründungen.", source: "OSHA Report 2023 · Verdi Pressemitteilung 2024", likes: 0, img: "https://images.pexels.com/photos/5591661/pexels-photo-5591661.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 17, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 290 * 60_000, tag: "Zucker", tagColor: "#ffcc00", text: "Haribo Goldbären bestehen zu 77 % aus Zucker. Eine 200g-Tüte enthält 154 g Zucker — das Sechsfache der WHO-Tageshöchstmenge für Kinder. ARD-Reportage 2020 zeigte zudem Tierschutzmängel in Haribo-Gelatine-Lieferketten.", source: "ARD Report 2020 · WHO Zucker-Richtlinien · Öko-Test 2024", likes: 0, img: "https://images.pexels.com/photos/701571/pexels-photo-701571.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 18, type: "bot", avatar: "🤖", name: "TRUE Bot", time: "", createdAt: _T - 310 * 60_000, tag: "Wasserrechte", tagColor: "#44aaff", text: "Danone (Evian, Volvic) entnimmt täglich Millionen Liter Quellwasser in Hochsavoyen — teils ohne ausreichende behördliche Prüfung. Lokale Bürger klagen, Quellen versiegen. Danone verfehlte gleichzeitig die eigenen Plastik-Reduktionsziele für 2025.", source: "Le Monde 2023 · WWF France · Plastics Scorecard", likes: 0, img: "https://images.pexels.com/photos/4996765/pexels-photo-4996765.jpeg?auto=compress&cs=tinysrgb&w=800" },
]

export const ALL_EVA_POSTS: FeedPost[] = [
  { id: 301, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 3 * 3_600_000, tag: "Zucker", tagColor: "#ffcc00", title: "Wie viel Zucker ist wirklich zu viel?", text: "Die WHO empfiehlt max. 25 g freie Zucker pro Tag. Eine Dose Cola enthält bereits 39 g. Industriezucker aktiviert dieselben Hirnareale wie Kokain — und steckt in fast jedem Fertigprodukt. Fertigprodukte verantworten 43 % der täglichen Zuckerzufuhr.", source: "WHO-Richtlinien 2023 · Deutsche Diabetes Gesellschaft 2024", likes: 0, img: "https://images.pexels.com/photos/3621340/pexels-photo-3621340.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 302, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 5 * 3_600_000, tag: "Industrie", tagColor: "#ff6633", title: "Nestlé gesteht: Nur 37 % des Portfolios ist gesund", text: "In einem internen Bericht, der der Financial Times zugespielt wurde, räumt Nestlé ein, dass der Großteil des Produktportfolios nicht einmal eigene Gesundheitsstandards erfüllt. CEO Mark Schneider spricht von 'Transformation' — Umweltgruppen fordern unabhängige Prüfung durch die EFSA.", source: "Financial Times 2021 · bestätigt durch Nestlé-Pressemitteilung", likes: 0, img: "https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 303, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 8 * 3_600_000, tag: "Palmöl ✅", tagColor: "#2ECC8A", title: "Unilever schließt 3 Palmöl-Lieferanten aus", text: "Unilever hat drei indonesische Lieferanten aus der Lieferkette ausgeschlossen, die mit Brandrodungen in Verbindung gebracht wurden. NGOs loben den Schritt, fordern aber unabhängige Überprüfung. Ich bleibe dran und berichte über die Umsetzung.", source: "Unilever Nachhaltigkeitsbericht 2024 · Greenpeace Stellungnahme", likes: 0, img: "https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 304, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 12 * 3_600_000, tag: "PFAS", tagColor: "#cc66ff", title: "Ewigkeits-Chemikalien: Was steckt in deiner Pfanne?", text: "PFAS sind in Antihaftbeschichtungen, Outdoor-Kleidung und Fast-Food-Verpackungen nachgewiesen. Schon geringe Mengen können das Immunsystem bei Kindern schwächen (EFSA 2020). Die EU plant ein breites Verbot — mit Ausnahmen für die Industrie.", source: "EFSA 2020 · ECHA Chemikalienregister · EU-Beschränkungsvorschlag 2023", likes: 0, img: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 305, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 4 * 3_600_000, tag: "Plastik", tagColor: "#ff8844", title: "Mikroplastik im Blut: Was wir jetzt wissen", text: "Erstmals wurde Mikroplastik im menschlichen Herzgewebe nachgewiesen — Studie der Universität Pavia 2024. Hauptquellen: Plastikflaschen, Fast-Food-Verpackungen und Waschmittelkapseln. Jährlich schlucken wir durchschnittlich eine Kreditkarte Plastik.", source: "Universität Pavia 2024 · WHO Mikroplastik-Report 2023", likes: 0, img: "https://images.pexels.com/photos/4195342/pexels-photo-4195342.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 306, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 6 * 3_600_000, tag: "Lobbying", tagColor: "#ff6633", title: "Wie Lebensmittelkonzerne Gesetze verzögern", text: "Interne Dokumente zeigen: Coca-Cola, Nestlé und PepsiCo haben in Brüssel über 17 Millionen Euro für Lobbying gegen striktere Zuckersteuer-Regelungen ausgegeben. Gleichzeitig finanzieren sie 'unabhängige' Ernährungswissenschaftler, die ihre Produkte verteidigen.", source: "Corporate Europe Observatory 2024 · LobbyFacts EU", likes: 0, img: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 307, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 9 * 3_600_000, tag: "Alternativen", tagColor: "#2ECC8A", title: "Mein Selbstversuch: 30 Tage ohne Konzernprodukte", text: "Ich habe einen Monat lang komplett auf Nestlé, Unilever und Coca-Cola verzichtet. Was ich gelernt habe: Es ist einfacher als gedacht, billiger als erwartet — und hat mein Einkaufsverhalten dauerhaft verändert. Hier ist meine komplette Liste an Alternativen.", source: "Persönlicher Bericht · TRUE Research Team", likes: 0, img: "https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 308, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 11 * 3_600_000, tag: "Industrie", tagColor: "#ff6633", title: "Haribo, Ferrero & Co.: Wer verdient an Kindern?", text: "Schokolade, Gummibärchen, Kekse — Konzerne wie Ferrero, Haribo und Mondelez richten bis zu 60 % ihres Marketings an Kinder unter 12. EU-Richtlinien greifen nicht, weil digitale Werbung auf TikTok und YouTube weitgehend unreguliert bleibt.", source: "WHO Europa 2024 · Europarl Ausschuss für Verbraucherschutz", likes: 0, img: "https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 309, type: "eva", avatar: "✍️", name: "Eva Müller", badge: "TRUE JOURNALISTIN", time: "", createdAt: _T - 14 * 3_600_000, tag: "Einkaufstipp", tagColor: "#2ECC8A", title: "5 Produkte, die ich nie wieder kaufe — und womit ich sie ersetze", text: "Nutella → Nocciolata. Ariel → Frosch oder Sodasan. Capri-Sonne → Voelkel Bio-Saft oder einfach Wasser. Milka → Vivani oder iChoc. KitKat → Vivani Dark. Alle günstiger oder gleichwertig im Preis — alle ohne die kritischen Lieferketten.", source: "TRUE Produktrecherche 2025 · Stiftung Warentest", likes: 0, img: "https://images.pexels.com/photos/2292919/pexels-photo-2292919.jpeg?auto=compress&cs=tinysrgb&w=800" },
]

export const ALL_TRUE_POSTS: FeedPost[] = [
  { id: 9001, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 1 * 3_600_000, tag: "Neu", tagColor: "#2ECC8A", badge: "OFFIZIELL", title: "Willkommen bei TRUE 👋", text: "TRUE ist deine App für ehrliche Produktinformationen — ohne Konzerninteressen. Scanne ein Produkt, erfahre die Wahrheit über Inhaltsstoffe, Konzernhintergrund und Alternativen. Wir sind unabhängig, kostenlos und wachsen mit eurer Community.", likes: 0, img: "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE Team · 2026" },
  { id: 9002, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 6 * 3_600_000, tag: "Tipp", tagColor: "#2ECC8A", badge: "OFFIZIELL", title: "So funktioniert der TRUE-Score", text: "Unser Score bewertet Produkte nach 4 Kriterien: Inhaltsstoffe (NOVA-Klasse), Verarbeitung, Konzernverhalten und Öko-Score. Ein Produkt kann gute Zutaten haben, aber von einem problematischen Konzern stammen — beides fließt ein.", likes: 0, img: "https://images.pexels.com/photos/6956183/pexels-photo-6956183.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE Produktbewertung · Methodik 2026" },
  { id: 9003, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 12 * 3_600_000, tag: "Mission", tagColor: "#2ECC8A", badge: "OFFIZIELL", title: "Unsere Mission: Transparenz im Supermarkt", text: "68 % der Deutschen wissen nicht, welchem Konzern ihre Lieblingsmarken gehören. Hinter 'Ja!' steckt Rewe, hinter 'Gut & Günstig' Edeka, hinter fast allem anderen Nestlé, Unilever oder P&G. TRUE macht das sichtbar — mit einem Scan.", likes: 0, img: "https://images.pexels.com/photos/3962285/pexels-photo-3962285.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE Research 2026 · GfK Verbraucherumfrage" },
  { id: 9004, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 20 * 3_600_000, tag: "Alternativen", tagColor: "#2ECC8A", badge: "OFFIZIELL", title: "Die TOP 10 Alternativen zu Konzernprodukten", text: "Nutella → Nocciolata · KitKat → Vivani Dark · Ariel → Sodasan · Pringles → Trafo Chips · Capri-Sonne → Voelkel Bio · Pampers → Lillydoo · Maggi → Bragg Liquid Aminos · Kinder → iChoc · Sprite → Bionade Zitrone · Milka → Zotter.\n\nAlle Alternativen findest du im Produktscan.", likes: 0, img: "https://images.pexels.com/photos/1435752/pexels-photo-1435752.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE Produktvergleich 2026" },
  { id: 9005, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 28 * 3_600_000, tag: "Update", tagColor: "#44aaff", badge: "OFFIZIELL", title: "Neues Feature: Familien-Score 👨‍👩‍👧‍👦", text: "Ab sofort: Der Familien-Score bewertet Produkte individuell für jedes Familienmitglied. Für Kinder unter 6 Jahren gelten strengere Kriterien — Zusatzstoffe, Palmöl und NOVA 4 werden noch stärker gewichtet. Einrichten unter Profil → Familienprofil.", likes: 0, img: "https://images.pexels.com/photos/4473796/pexels-photo-4473796.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE App Update · Mai 2026" },
  { id: 9006, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 36 * 3_600_000, tag: "Wissen", tagColor: "#ffcc00", badge: "OFFIZIELL", title: "Was bedeutet NOVA Gruppe 4?", text: "NOVA 4 = ultra-verarbeitet. Das bedeutet: Das Produkt enthält industrielle Zutaten, die in keiner Heimküche vorkommen — Emulgatoren, Geschmacksverstärker, Farbstoffe, Stabilisatoren. Studien zeigen: NOVA 4 ist mit höherem Risiko für Übergewicht, Diabetes und Herzerkrankungen verbunden.", likes: 0, img: "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800", source: "NOVA Classification · INSERM 2019 · BMJ 2019" },
  { id: 9007, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 44 * 3_600_000, tag: "Community", tagColor: "#2ECC8A", badge: "OFFIZIELL", title: "Danke für 1.000 Scans! 🎉", text: "Die TRUE-Community hat bereits über 1.000 Produkte gescannt und bewertet. Meistgescannt: Nutella (Note D), Pringles (Note C), Alpro Hafermilch (Note B). Zusammen machen wir den Supermarkt transparenter. Teile TRUE mit Freunden — je mehr mitmachen, desto stärker die Community.", likes: 0, img: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE Community Statistik · 2026" },
  { id: 9008, type: "official", avatar: "✅", name: "TRUE", time: "", createdAt: _T - 52 * 3_600_000, tag: "Tipp", tagColor: "#2ECC8A", badge: "OFFIZIELL", title: "Dein Ziel-Modus: So nutzt du ihn richtig", text: "Stelle deinen persönlichen Fokus ein: Umwelt, Gesundheit, Familie, Wahrheit, Aktion oder Budget. Je nach Ziel bewertet TRUE dasselbe Produkt anders und gibt dir passende Tipps. Einstellbar unter Profil → Meine Ziele.", likes: 0, img: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=800", source: "TRUE Produktscan · Ziel-Modus 2026" },
]

export const ALL_POSITIVE_POSTS: FeedPost[] = [
  { id: 401, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 2 * 3_600_000, tag: "Fortschritt", tagColor: "#2ECC8A", title: "dm stoppt Palmöl aus nicht-zertifizierten Quellen", text: "dm hat bekannt gegeben, ab 2025 nur noch RSPO-zertifiziertes Palmöl in Eigenmarkenprodukten zu verwenden — und will bis 2027 komplett auf Palmöl-Alternativen umstellen. Greenpeace: 'erster ernsthafter Schritt im deutschen Einzelhandel'.", source: "dm Pressemitteilung 2024 · Greenpeace Deutschland", likes: 0, img: "https://images.pexels.com/photos/3943748/pexels-photo-3943748.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 402, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 4 * 3_600_000, tag: "Klima-Urteil", tagColor: "#2ECC8A", title: "Shell muss Emissionen um 45 % senken — Urteil bestätigt", text: "Das Berufungsgericht Den Haag bestätigt: Shell muss CO₂-Emissionen bis 2030 um 45 % senken. Milieudefensie spricht von 'historischem Sieg'. Das Urteil hat Signalwirkung für Klagen gegen ExxonMobil, BP und TotalEnergies.", source: "Rechtbank Den Haag 2024 · Milieudefensie", likes: 0, img: "https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 403, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 5 * 3_600_000, tag: "Verbot", tagColor: "#2ECC8A", title: "Frankreich verbietet Wegwerf-Plastik in Fast-Food-Restaurants", text: "Seit Januar 2024 müssen McDonald's, Burger King und KFC in Frankreich wiederverwendbares Geschirr anbieten. Erste Auswertungen zeigen: 80 % weniger Plastikabfall pro Besucher. Deutschland zögert noch — obwohl die EU-Richtlinie dies vorschreibt.", source: "Agence France-Presse 2024 · ADEME Studie", likes: 0, img: "https://images.pexels.com/photos/802143/pexels-photo-802143.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 404, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 6 * 3_600_000, tag: "Kennzeichnung", tagColor: "#2ECC8A", title: "Nutri-Score wird verbindlich — Deutschland stimmt zu", text: "Die EU hat sich auf eine verbindliche Nutri-Score-Kennzeichnung geeinigt. Ab 2026 müssen alle Lebensmittelhersteller den Score auf der Vorderseite der Verpackung angeben. Für Nutella, Maggi und Co. eine unbequeme Wahrheit: D und E auf einen Blick.", source: "EU-Kommission Pressemitteilung 2024 · Foodwatch", likes: 0, img: "https://images.pexels.com/photos/3872373/pexels-photo-3872373.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 405, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 7 * 3_600_000, tag: "Klage", tagColor: "#2ECC8A", title: "ClientEarth verklagt Nestlé wegen Plastik-Versprechen", text: "Die Umweltrechtsorganisation ClientEarth hat in der Schweiz Klage gegen Nestlé eingereicht, weil das Unternehmen seine eigenen Plastik-Reduktionsziele systematisch verfehlt hat. Dies könnte einen Präzedenzfall für Corporate Accountability schaffen.", source: "ClientEarth Pressemitteilung 2025 · Financial Times", likes: 0, img: "https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 406, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 8 * 3_600_000, tag: "Boykott", tagColor: "#2ECC8A", title: "#KeinNestlé: Boykott-Kampagne erreicht 2 Millionen Unterzeichner", text: "Die von Foodwatch und Greenpeace getragene Kampagne #KeinNestlé hat in Deutschland 2 Millionen Unterzeichner erreicht. Nestlé verzeichnete im ersten Quartal 2025 erstmals seit 10 Jahren einen Umsatzrückgang in Deutschland. Kollektiver Druck wirkt.", source: "Foodwatch Kampagnenbericht 2025 · Nestlé Quartalsergebnisse", likes: 0, img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 407, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 9 * 3_600_000, tag: "Forschung", tagColor: "#2ECC8A", title: "Studie: Bio-Ernährung senkt Pestizidbelastung um 90 % in 2 Wochen", text: "Schwedische Forscher zeigten: Nur 2 Wochen Bio-Ernährung reichen, um die Pestizidrückstände im Urin um bis zu 90 % zu senken. Die gute Nachricht: Schon wenige strategische Umstellungen reichen aus — nicht alles muss Bio sein.", source: "PLOS ONE 2015 · repliziert Chalmers University 2024", likes: 0, img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 408, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 10 * 3_600_000, tag: "Kennzeichnung", tagColor: "#2ECC8A", title: "Rewe und Aldi stoppen 120 Produkte mit irreführenden Labels", text: "Nach Druck von Foodwatch und Verbraucherzentralen haben Rewe und Aldi insgesamt 120 Eigenmarken-Produkte mit irreführenden Beschriftungen wie 'natürlich' und 'ursprünglich' vom Markt genommen oder neu etikettiert. Ein echter Erfolg für Verbraucher.", source: "Foodwatch Bericht 2025 · Stiftung Warentest", likes: 0, img: "https://images.pexels.com/photos/3025564/pexels-photo-3025564.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { id: 409, type: "positive", avatar: "🌱", name: "TRUE Positive News", time: "", createdAt: _T - 11 * 3_600_000, tag: "Palmöl-frei", tagColor: "#2ECC8A", title: "Nocciolata, Rapunzel & Co.: Das sind die besten Nutella-Alternativen", text: "TRUE hat 12 Nutella-Alternativen verglichen: Nocciolata Bio (Rigoni di Asiago), Bionella (Rapunzel) und Schokocreme (Alnatura) überzeugen ohne Palmöl, ohne künstliche Aromen. Alle unter 5€ — bei dm, Rewe Bio und Alnatura erhältlich.", source: "TRUE Produktvergleich 2025 · Öko-Test 2024", likes: 0, img: "https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=800" },
]

export interface ChannelMeta {
  id: string
  avatar: string
  name: string
  badge: string
  badgeColor: string
  bio: string
  posts: FeedPost[]
  verified?: boolean
  accentColor: string
}

export const CHANNEL_META: Record<string, ChannelMeta> = {
  "official": {
    id: "official",
    avatar: "✅",
    name: "TRUE",
    badge: "OFFIZIELL",
    badgeColor: "#2ECC8A",
    bio: "Deine App für ehrliche Produktinformationen — unabhängig, transparent, kostenlos. Wir machen sichtbar, was Konzerne verstecken.",
    posts: ALL_TRUE_POSTS,
    verified: true,
    accentColor: "#2ECC8A",
  },
  "eva": {
    id: "eva",
    avatar: "✍️",
    name: "Eva Müller",
    badge: "JOURNALISTIN",
    badgeColor: "#0088ff",
    bio: "Unabhängige Recherchen zu Lebensmitteln, Konzernen und dem, was wir wirklich essen. TRUE Redaktion seit 2024.",
    posts: ALL_EVA_POSTS,
    verified: false,
    accentColor: "#0088ff",
  },
  "bot": {
    id: "bot",
    avatar: "🤖",
    name: "TRUE Bot",
    badge: "BOT",
    badgeColor: "#2ECC8A",
    bio: "Tägliche Fakten zu Konzernen, Lieferketten und Lebensmittelskandalen — automatisch kuratiert aus verifizierten Quellen.",
    posts: ALL_BOT_POSTS,
    verified: false,
    accentColor: "#2ECC8A",
  },
  "positive": {
    id: "positive",
    avatar: "🌱",
    name: "TRUE Positive",
    badge: "POSITIV",
    badgeColor: "#2ECC8A",
    bio: "Gute Nachrichten: Urteile gegen Konzerne, politische Fortschritte, echte Veränderungen. Weil Hoffnung auch zur Wahrheit gehört.",
    posts: ALL_POSITIVE_POSTS,
    verified: false,
    accentColor: "#2ECC8A",
  },
}

// Map from post.type to channel id
export function postTypeToChannelId(type: string): string | null {
  if (type === "official") return "official"
  if (type === "eva") return "eva"
  if (type === "bot") return "bot"
  if (type === "positive") return "positive"
  if (type === "user") return null // user channels handled separately
  return null
}
