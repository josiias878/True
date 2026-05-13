/**
 * Shared product name → emoji + category detection.
 * Used by home/page.tsx, list/page.tsx, scan/page.tsx.
 */

type Category = "produce" | "dairy" | "bread" | "pasta" | "meat" | "frozen" | "drinks" | "snacks" | "household"

// [regex, emoji, category]
const RULES: [RegExp, string, Category][] = [
  // ── Tierbedarf ───────────────────────────────────────────────────────────────
  [/knochen|hundeknochen|kauzahn|kauartikel/,                "🦴", "household"],
  [/hundefutter|tiernahrung|tierfutter|hundenassfutter|hundepâté/, "🐕", "household"],
  [/katzenfutter|katzennass|katzentrocken/,                  "🐱", "household"],
  [/katzenstreu|tierstreu|klumpstreu/,                       "🐾", "household"],
  [/vogelfutter|körnermix|wellensittich/,                    "🐦", "household"],
  [/aquarienfutter|fischfutter/,                              "🐠", "household"],
  [/hundehalsband|hundeline|leine|halsband/,                 "🐕", "household"],
  [/tiernapf|futternapf|trinknapf/,                         "🐾", "household"],
  [/leckerli|hundeleckerli|snack.*hund|hund.*snack/,        "🦴", "household"],

  // ── Baby ─────────────────────────────────────────────────────────────────────
  [/windeln?|pampers|baby.?windel/,                          "🍼", "household"],
  [/babybrei|beikost|gläschen|säuglings|baby.?milch|kindermilch/, "🍼", "household"],
  [/feuchttücher|babytücher|wischtücher/,                    "🧴", "household"],

  // ── Früchte ──────────────────────────────────────────────────────────────────
  [/ananas/,                                                  "🍍", "produce"],
  [/mango/,                                                   "🥭", "produce"],
  [/kiwi/,                                                    "🥝", "produce"],
  [/avocado/,                                                 "🥑", "produce"],
  [/banane/,                                                  "🍌", "produce"],
  [/apfel(?!saft)/,                                           "🍎", "produce"],
  [/birne/,                                                   "🍐", "produce"],
  [/erdbeere/,                                                "🍓", "produce"],
  [/himbeere|brombeere/,                                      "🍓", "produce"],
  [/blaubeere|heidelbeere/,                                   "🫐", "produce"],
  [/wassermelone|honigmelone|cantaloupe/,                     "🍉", "produce"],
  [/kirsche/,                                                 "🍒", "produce"],
  [/pfirsich|nektarine/,                                      "🍑", "produce"],
  [/pflaume|zwetschge/,                                       "🍑", "produce"],
  [/orange(?!nsaft)|mandarine|clementine|satsuma/,            "🍊", "produce"],
  [/zitrone|limette/,                                         "🍋", "produce"],
  [/grapefruit/,                                              "🍋", "produce"],
  [/weintraube|traube(?!nsaft)/,                              "🍇", "produce"],
  [/feige/,                                                   "🍇", "produce"],
  [/granatapfel/,                                             "🍎", "produce"],
  [/kokosnuss|kokos(?!milch)/,                                "🥥", "produce"],
  [/papaya/,                                                  "🥭", "produce"],
  [/litschi|longan/,                                          "🍇", "produce"],
  [/datteln?/,                                                "🍇", "produce"],

  // ── Gemüse ───────────────────────────────────────────────────────────────────
  [/tomate(?!nmark|nsoß|npaste|nsauce)/,                      "🍅", "produce"],
  [/karotte|möhre/,                                           "🥕", "produce"],
  [/kartoffel(?!chip)/,                                       "🥔", "produce"],
  [/gurke/,                                                   "🥒", "produce"],
  [/paprika/,                                                 "🫑", "produce"],
  [/brokkoli|broccoli/,                                       "🥦", "produce"],
  [/blumenkohl|romanesco/,                                    "🥦", "produce"],
  [/rosenkohl/,                                               "🥦", "produce"],
  [/spinat/,                                                  "🥬", "produce"],
  [/feldsalat|rucola|radicchio/,                              "🥬", "produce"],
  [/eisberg|kopfsalat|salat(?!soße|dressing)/,                "🥬", "produce"],
  [/zwiebel/,                                                 "🧅", "produce"],
  [/knoblauch/,                                               "🧄", "produce"],
  [/mais/,                                                    "🌽", "produce"],
  [/pilz|champignon|pfifferling|steinpilz|shiitake/,          "🍄", "produce"],
  [/spargel/,                                                 "🌿", "produce"],
  [/zucchini/,                                                "🥒", "produce"],
  [/aubergine/,                                               "🍆", "produce"],
  [/fenchel|staudensellerie|sellerie/,                        "🌿", "produce"],
  [/lauch|porree/,                                            "🌿", "produce"],
  [/rote.?bete|rübe/,                                         "🥕", "produce"],
  [/erbsen|bohnen|dicke.?bohnen/,                             "🌿", "produce"],
  [/kichererbsen/,                                            "🌿", "produce"],
  [/linsen/,                                                  "🌿", "produce"],
  [/süßkartoffel/,                                            "🍠", "produce"],
  [/ingwer/,                                                  "🧄", "produce"],
  [/tofu|tempeh|seitan/,                                      "🌿", "produce"],
  [/hummus/,                                                  "🫙", "produce"],

  // ── Käse (vor allgemeinem "milch") ──────────────────────────────────────────
  [/feta/,                                                    "🧀", "dairy"],
  [/mozzarella/,                                              "🧀", "dairy"],
  [/parmesan|parmigiano/,                                     "🧀", "dairy"],
  [/gouda|edamer|emmental|gruyère/,                           "🧀", "dairy"],
  [/brie|camembert|gorgonzola|roquefort/,                     "🧀", "dairy"],
  [/cheddar|manchego|pecorino/,                               "🧀", "dairy"],
  [/frischkäse|hüttenkäse|cottage/,                           "🧀", "dairy"],
  [/ricotta|mascarpone/,                                      "🧀", "dairy"],
  [/käse/,                                                    "🧀", "dairy"],

  // ── Milch & Milchprodukte ────────────────────────────────────────────────────
  [/joghurt|yoghurt|skyr/,                                    "🍶", "dairy"],
  [/quark/,                                                   "🥛", "dairy"],
  [/sahne|schmand|crème.?fraîche|crème fraiche/,              "🥛", "dairy"],
  [/butter/,                                                  "🧈", "dairy"],
  [/margarine/,                                               "🧈", "dairy"],
  [/ei(?:er)?$/,                                              "🥚", "dairy"],
  [/hafermilch|mandelmilch|sojamilch|kokosmilch|reismilch|pflanzenmilch/, "🥛", "dairy"],
  [/milch(?!shake|schokolade)/,                               "🥛", "dairy"],

  // ── Fleisch & Fisch ──────────────────────────────────────────────────────────
  [/hähnchen|hühnchen|poulet|hühnerbrust|hähnchenfilet/,      "🍗", "meat"],
  [/pute|truthahn|putenbrust/,                                "🍗", "meat"],
  [/ente|gans/,                                               "🍗", "meat"],
  [/hackfleisch|rinderhack|gemischtes.?hack|hack(?!en)/,      "🥩", "meat"],
  [/steak|rindersteak|entrecôte|rumpsteak|filetsteak/,        "🥩", "meat"],
  [/rindfleisch|rind(?:er)?/,                                 "🥩", "meat"],
  [/schweinefleisch|schweinsbraten|kotelett|schnitzel/,       "🥩", "meat"],
  [/lammfleisch|lamm(?:keule|rücken|kotlett)/,               "🥩", "meat"],
  [/speck|bacon/,                                             "🥓", "meat"],
  [/schinken(?!käse)/,                                        "🥓", "meat"],
  [/wurst|bratwurst|weißwurst|blutwurst|leberwurst|bockwurst/, "🌭", "meat"],
  [/salami|chorizo|pepperoni/,                                "🌭", "meat"],
  [/aufschnitt|mortadella/,                                   "🌭", "meat"],
  [/frikadelle|bulette|meatball/,                             "🍖", "meat"],
  [/lachs(?!ersatz)/,                                         "🐟", "meat"],
  [/thunfisch|thun/,                                          "🐟", "meat"],
  [/fischfilet|seelachs|kabeljau|dorsch|forelle|hering|makrele|tilapia/, "🐟", "meat"],
  [/fischstäbchen/,                                           "🐟", "frozen"],
  [/garnelen?|shrimps?|crevetten/,                            "🍤", "meat"],
  [/muscheln?|jakobsmuschel/,                                 "🦪", "meat"],

  // ── Getränke ─────────────────────────────────────────────────────────────────
  [/mineralwasser|sprudelwasser|sprudel(?!gebäck)/,           "💧", "drinks"],
  [/wasser(?!melone)/,                                        "💧", "drinks"],
  [/orangensaft|oj\b/,                                        "🍊", "drinks"],
  [/apfelsaft/,                                               "🍎", "drinks"],
  [/saft(?!ig)/,                                              "🧃", "drinks"],
  [/smoothie/,                                                "🥤", "drinks"],
  [/cola|pepsi|coca.?cola/,                                   "🥤", "drinks"],
  [/fanta|sprite|limo(?:nade)?|7.?up|mezi/,                  "🥤", "drinks"],
  [/eistee/,                                                  "🧃", "drinks"],
  [/red.?bull|monster|powerade|energy.?drink/,                "⚡", "drinks"],
  [/bier|pils|weizen(?!brot)|lager|ale|ipa/,                  "🍺", "drinks"],
  [/wein(?!traub|essig)/,                                     "🍷", "drinks"],
  [/prosecco|sekt|champagner|cava/,                           "🍾", "drinks"],
  [/kaffee|cappuccino|espresso|latte/,                        "☕", "drinks"],
  [/nescaf|kaffeepads|kapseln/,                               "☕", "drinks"],
  [/tee(?!\w)/,                                               "🍵", "drinks"],
  [/kakao(?!pulver.*snack)|heiße.?schoko|trinkschoko/,        "☕", "drinks"],
  [/kokoswasser/,                                             "🥥", "drinks"],

  // ── Brot & Backwaren ─────────────────────────────────────────────────────────
  [/brötchen|semmel|schrippe/,                                "🥐", "bread"],
  [/croissant/,                                               "🥐", "bread"],
  [/bagel/,                                                   "🥯", "bread"],
  [/brezel|laugenbrezel/,                                     "🥨", "bread"],
  [/baguette|ciabatta|focaccia/,                              "🥖", "bread"],
  [/toast(?!brot)/,                                           "🍞", "bread"],
  [/toastbrot|sandwichbrot/,                                  "🍞", "bread"],
  [/vollkornbrot|roggenbrot|körner(?:brot)/,                  "🍞", "bread"],
  [/brot(?!aufstrich|chip)/,                                  "🍞", "bread"],
  [/wraps?|tortilla(?!chips)/,                                "🌮", "bread"],
  [/pita|fladenbrot|naan|chapati/,                            "🫓", "bread"],
  [/knäckebrot|crispbread/,                                   "🍞", "bread"],
  [/kuchen|torte|muffin|brownie|donut/,                       "🎂", "snacks"],
  [/waffeln?(?!chips)/,                                       "🧇", "snacks"],
  [/pfannkuchen|crepe/,                                       "🥞", "snacks"],

  // ── Pasta & Getreide ─────────────────────────────────────────────────────────
  [/spaghetti|tagliatelle|pappardelle|linguine|fettuccine/,   "🍝", "pasta"],
  [/penne|rigatoni|fusilli|farfalle|conchiglie|orecchiette/,  "🍝", "pasta"],
  [/nudeln?|pasta/,                                           "🍝", "pasta"],
  [/lasagne(?!platte)/,                                       "🍝", "pasta"],
  [/gnocchi/,                                                 "🍝", "pasta"],
  [/reis(?!ig|brei|waffel)/,                                  "🍚", "pasta"],
  [/reiswaffel/,                                              "🍘", "snacks"],
  [/couscous|bulgur|dinkel|hirse|amaranth/,                   "🌾", "pasta"],
  [/quinoa/,                                                  "🌾", "pasta"],
  [/haferflocken|hafer(?!milch)/,                             "🥣", "pasta"],
  [/müsli|granola|birchermüsli/,                              "🥣", "pasta"],
  [/cornflakes|flakes|cerealien/,                             "🥣", "pasta"],
  [/mehl(?!speise)/,                                          "🌾", "pasta"],
  [/grieß/,                                                   "🌾", "pasta"],
  [/backmischung|backpulver|hefe/,                            "🌾", "bread"],

  // ── Tiefkühl ─────────────────────────────────────────────────────────────────
  [/tiefkühl|gefrier|tk-|frozen/,                             "🧊", "frozen"],
  [/speiseeis|eiscreme|sorbet|eis(?!tee|diele|becher.*kaffee)/, "🍦", "frozen"],
  [/tiefkühlpizza|tk.?pizza/,                                 "🍕", "frozen"],
  [/tiefkühlgemüse|tk.?gemüse/,                               "🥦", "frozen"],

  // ── Snacks & Süßes ───────────────────────────────────────────────────────────
  [/chips(?!satz)|crisps|erdnussflips/,                       "🥔", "snacks"],
  [/tortilla.?chips|nachos/,                                  "🌮", "snacks"],
  [/popcorn/,                                                 "🍿", "snacks"],
  [/schokolade|schoko(?!lade)|choco/,                         "🍫", "snacks"],
  [/gummibärchen|haribo|gummi(?!band)/,                       "🍬", "snacks"],
  [/bonbons?|lutsch|drops\b/,                                 "🍬", "snacks"],
  [/kaugummi/,                                                "🍬", "snacks"],
  [/keks|kekse|plätzchen|cookie|spekulatius/,                 "🍪", "snacks"],
  [/cracker|reiscracker|salzstangen/,                         "🍘", "snacks"],
  [/müsliriegel|energieriegel|proteinriegel|riegel/,          "🍫", "snacks"],
  [/nüsse|nuss(?!kuchen)/,                                    "🥜", "snacks"],
  [/erdnuss(?!öl)/,                                           "🥜", "snacks"],
  [/cashew|mandeln?|walnuss|haselnuss|pistazien?|pekan|macadamia/, "🥜", "snacks"],
  [/pizza(?!igel)/,                                           "🍕", "snacks"],
  [/burger/,                                                  "🍔", "snacks"],
  [/hot.?dog/,                                                "🌭", "snacks"],

  // ── Gewürze & Konserven ──────────────────────────────────────────────────────
  [/salz(?!ig)/,                                              "🧂", "produce"],
  [/pfeffer(?!minz)/,                                         "🧂", "produce"],
  [/curry|kurkuma|zimt|paprikapulver|chili(?!soße)|cayenne/,  "🧂", "produce"],
  [/gewürz|oregano|basilikum|thymian|rosmarin|petersilie|schnittlauch/, "🌿", "produce"],
  [/vanille/,                                                 "🌿", "produce"],
  [/honig/,                                                   "🍯", "produce"],
  [/ahornsirup|agavensirup/,                                  "🍯", "produce"],
  [/zucker(?!watte)/,                                         "🍬", "produce"],
  [/marmelade|konfitüre|aufstrich(?!käse)/,                   "🍓", "snacks"],
  [/nuss.?nougat|schokoladen.?aufstrich/,                     "🍫", "snacks"],
  [/erdnussbutter|mandelmus|tahini/,                          "🥜", "snacks"],
  [/olivenöl|kokosöl|rapsöl|sonnenblumenöl|öl(?!sardinen)/,  "🫒", "produce"],
  [/essig(?!gurken)/,                                         "🫙", "produce"],
  [/tomatenmark|tomatensoße|tomatenpaste|tomatensauce/,       "🍅", "produce"],
  [/senf/,                                                    "🌭", "produce"],
  [/ketchup/,                                                 "🍅", "produce"],
  [/mayo|mayonnaise/,                                         "🥚", "produce"],
  [/soja.?soße|soja.?sauce/,                                  "🫙", "produce"],
  [/pesto/,                                                   "🌿", "produce"],
  [/salsa|bbq.?soße|worcestersauce/,                          "🍅", "produce"],
  [/konserve|dose.*(gemüse|fisch|bohnen|mais|tomate)/,        "🥫", "produce"],

  // ── Hygiene & Haushalt ───────────────────────────────────────────────────────
  [/zahnpasta|zahnbürste|zahncreme|mundspülung/,              "🦷", "household"],
  [/shampoo|conditioner|haarspülung|haarkur/,                 "🧴", "household"],
  [/duschgel|duschbad/,                                       "🧴", "household"],
  [/seife(?!noper)/,                                          "🧼", "household"],
  [/deo|deodorant|antiperspirant/,                            "🧴", "household"],
  [/creme|lotion|bodylotion|gesichtscreme|sonnencreme/,       "🧴", "household"],
  [/rasiergel|rasierschaum|rasierer/,                         "🧴", "household"],
  [/waschmittel|vollwaschmittel/,                             "🧺", "household"],
  [/weichspüler/,                                             "🧺", "household"],
  [/spülmittel|geschirrspülmittel/,                           "🫧", "household"],
  [/spülmaschinentabs?|spültabs?|finish/,                     "🫧", "household"],
  [/allzweckreiniger|reiniger|putzmittel|bad(?:reiniger)|wc.?reiniger/, "🧹", "household"],
  [/schwamm|scheuertuch|mikrofaser/,                          "🧽", "household"],
  [/klopapier|toilettenpapier/,                               "🧻", "household"],
  [/küchenpapier|küchenrolle/,                                "🧻", "household"],
  [/taschentücher|tempo/,                                     "🤧", "household"],
  [/müllbeutel|müllsack|abfallbeutel/,                        "🗑️", "household"],
  [/frischhaltefolie|alufolie/,                               "📦", "household"],
  [/gefrierbeutel|ziplock/,                                   "📦", "household"],
  [/persil|ariel|coral|frosch(?:.?waschmittel)/,              "🧺", "household"],
  [/fairy|frosch(?:.?spül)|pril/,                             "🫧", "household"],
]

export function guessEmoji(name: string): string {
  const n = name.toLowerCase()
  for (const [pattern, emoji] of RULES) {
    if (pattern.test(n)) return emoji
  }
  return "🛒"
}

export function guessCategory(name: string): Category {
  const n = name.toLowerCase()
  for (const [pattern, , category] of RULES) {
    if (pattern.test(n)) return category
  }
  return "produce"
}
