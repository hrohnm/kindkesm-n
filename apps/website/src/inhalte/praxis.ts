/**
 * Inhalte der Website an einer Stelle. Texte der bisherigen Website (Tippfehler korrigiert),
 * ergänzt um Entwürfe (FAQ, Zeitstrahl, Kassenhinweise), die die Praxis prüfen und anpassen sollte.
 */
import type { ImageMetadata } from "astro";
import babymassageRuecken from "../assets/bilder/babymassage-ruecken.jpg";
import beikostLoeffel from "../assets/bilder/beikost-loeffel.jpg";
import mutterNeugeborenSw from "../assets/bilder/mutter-neugeboren-sw.jpg";
import neugeborenDecke from "../assets/bilder/neugeboren-decke.jpg";
import paarBauch from "../assets/bilder/paar-bauch.jpg";
import schwangerschaftHaende from "../assets/bilder/schwangerschaft-haende.jpg";
import schwangerschaftProfil from "../assets/bilder/schwangerschaft-profil.jpg";
import stillenSessel from "../assets/bilder/stillen-sessel.jpg";
import yogaSitzend from "../assets/bilder/yoga-sitzend.jpg";
import babyfuesseHaende from "../assets/bilder/babyfuesse-haende.jpg";

export const PRAXIS = {
  name: "Hebammenpraxis Kindkesmöön",
  kurz: "Kindkesmöön",
  motto: "liebevoll und geborgen begleitet",
  strasse: "Neue Reihe 46b",
  plz: "18209",
  ort: "Bad Doberan",
  geo: { lat: 54.1088, lon: 11.8924 },
  instagram: "https://www.instagram.com/hebammenpraxis_kindkesmoen",
  instagramName: "@hebammenpraxis_kindkesmoen",
  presse: {
    titel: "Ostsee-Zeitung: „Schwanger in Bad Doberan: Hebammen eröffnen neue Praxis Kindkesmöön“",
    url: "https://www.ostsee-zeitung.de/lokales/rostock-lk/bad-doberan/schwanger-in-bad-doberan-hebammen-eroeffnen-neue-praxis-kindkesmoeoen-F4U2SBJHN5C4LCEMYCW5475AMA.html",
  },
} as const;

export const NAMENSERKLAERUNG = [
  "Kindkesmöön ist ein plattdeutscher Ausdruck, der sich aus den Begriffen „Kindkes“ für „Baby“ und „Möön“ für „Tante“ zusammensetzt.",
  "Im norddeutschen Raum nannte man Hebammen unter anderem so und erzählte den Kindern über sie, sie würden die Babys bringen. So fragten viele Kinder bei dem Wunsch nach einem Geschwisterchen, ob denn nicht bald die liebe Kindkesmöön kommen könne.",
];

export type Hebamme = { name: string; vorname: string; kuerzel: string; telefon?: string; email: string; hinweis?: string; schwerpunkte: string[] };

/** Telefon und E-Mail wie auf der bisherigen Website. Schwerpunkte: Entwurf, bitte je Hebamme anpassen. */
export const TEAM: Hebamme[] = [
  { name: "Marielena Pontus", vorname: "Marielena", kuerzel: "MP", telefon: "0157 38386217", email: "hebamme.marielena@outlook.de", schwerpunkte: ["Schwangerschaftsvorsorge", "Wochenbett", "Geburtsvorbereitung"] },
  { name: "Johanna Mede", vorname: "Johanna", kuerzel: "JM", telefon: "0157 54781800", email: "hebamme.johannamede@gmail.com", schwerpunkte: ["Wochenbett", "Stillberatung", "Babymassage"] },
  { name: "Lorina Gosemann", vorname: "Lorina", kuerzel: "LG", email: "hebamme.lorinaduwe@gmail.com", hinweis: "aktuell in Babypause", schwerpunkte: ["Geburtsvorbereitung", "Krabbelkiste"] },
];

export const UEBER_UNS = [
  "Im Jahr 2014 begannen wir gemeinsam unsere Hebammenausbildung und schlossen diese im Jahr 2017 mit dem Examen ab. Bereits während der Ausbildung entstand der Wunsch, Schwangere, Mütter und Familien ganzheitlich, liebevoll und kompetent zu betreuen.",
  "Wir sind empathische Hebammen, die einen Fokus auf jede einzelne Familiensituation legen und somit eine individuelle Betreuung gewährleisten. Wir möchten euch als Eltern unterstützen, euren eigenen Weg zu finden, und euch in dieser besonderen Zeit stärken. Dabei arbeiten wir evidenzbasiert und bilden uns regelmäßig fort.",
];

export const STIMMEN = [
  { von: "M. R.", text: "Ich werde seit einigen Wochen von der Hebamme Marielena betreut. Am Wochenende haben mein Mann und ich am Geburtsvorbereitungskurs teilgenommen. Es war sehr informativ, eine angenehme Atmosphäre und beide sind sehr kompetente, liebe junge Frauen. Die Praxis ist sehr liebevoll eingerichtet." },
  { von: "S. S.", text: "Ich hatte am Wochenende den Geburtsvorbereitungskurs. Beide Tage waren informativ, praxisnah, herzlich und wertfrei gestaltet. Ich hab mich sehr wohl gefühlt. Absolute Weiterempfehlung!" },
  { von: "S. V.", text: "Ich persönlich finde diese Praxis einen magischen Ort, wo die Liebe zum Beruf zu spüren ist. Würde ich noch ein Kind erwarten, würde diese Praxis meine erste Anlaufstelle!" },
];

export const GEBIETE = [
  "Bad Doberan", "Heiligendamm", "Börgerende-Rethwisch", "Nienhagen", "Elmenhorst-Lichtenhagen", "Admannshagen-Bargeshagen", "Sievershagen",
  "Lambrechtshagen", "Bartenshagen-Parkentin", "Kritzmow", "Stäbelow", "Satow", "Retschow", "Jürgenshagen", "Hohenfelde", "Kröpelin",
  "Boldenshagen", "Reddelich", "Steffenshagen", "Wittenbeck", "Rostock",
];

export type Leistung = { id: string; titel: string; kurz: string; text: string[]; kasse: string; bild: ImageMetadata; bildAlt: string; link?: { text: string; href: string } };

export const LEISTUNGEN: Leistung[] = [
  {
    id: "schwangerschaft",
    titel: "Schwangerschaftsvorsorge",
    kurz: "Untersuchung und Beratung in der Schwangerschaft – auch im Wechsel mit der Frauenarztpraxis.",
    text: [
      "Die Schwangerschaftsvorsorge wird durch die Mutterschafts-Richtlinien geregelt und kann sowohl von Frauenärztinnen und -ärzten als auch von Hebammen durchgeführt werden. Auch ein Wechselmodell ist möglich.",
      "Gerne begleiten wir, wenn gewünscht, deine Schwangerschaft und untersuchen und beraten dich im Verlauf – bei dir zu Hause oder in unserer Praxis.",
    ],
    kasse: "Leistung der gesetzlichen Krankenkasse.",
    bild: schwangerschaftHaende,
    bildAlt: "Hände auf einem Babybauch",
  },
  {
    id: "beschwerden",
    titel: "Hilfe bei Beschwerden",
    kurz: "Natürliche Unterstützung bei Übelkeit, Rückenschmerzen, Wassereinlagerungen und mehr.",
    text: [
      "Als Hebammen sind wir dazu ausgebildet, mit natürlichen oder speziellen Maßnahmen deine Beschwerden in der Schwangerschaft und im Wochenbett zu begleiten und im Idealfall zu lindern.",
    ],
    kasse: "Leistung der gesetzlichen Krankenkasse.",
    bild: schwangerschaftProfil,
    bildAlt: "Schwangere Frau im Profil",
  },
  {
    id: "geburtsvorbereitung",
    titel: "Geburtsvorbereitung",
    kurz: "Wissen, Übungen und Zuversicht für die Geburt – am Wochenende, gern mit Begleitperson.",
    text: [
      "In unserem Kurs „Ankommen im Leben“ erfährst du alles Wichtige über den Verlauf der Schwangerschaft, die Phasen der Geburt und die erste Zeit nach der Entbindung. Durch Wissen und praktische Übungen stärken wir euer Selbstvertrauen.",
    ],
    kasse: "Für Schwangere übernimmt die Krankenkasse die Kosten; für die Begleitperson fällt eine Teilnahmegebühr an, die viele Kassen erstatten.",
    bild: paarBauch,
    bildAlt: "Paar mit Händen auf dem Babybauch",
    link: { text: "Zu den Kursen", href: "/kurse" },
  },
  {
    id: "wochenbett",
    titel: "Wochenbettbetreuung",
    kurz: "Hausbesuche nach der Geburt – mit gutem Blick auf euer Baby und deinen Körper.",
    text: [
      "Das Wochenbett ist eine besondere und sensible Phase im Leben einer Frau. Wir unterstützen euch in dieser Phase mit unserem Wissen, achten auf einen natürlichen und gesunden Verlauf und begleiten euch als werdende Familie – immer mit einem guten Blick auf euer Baby und deinen Körper.",
      "Wir kommen zu euch nach Hause: in den ersten Tagen täglich, danach nach Bedarf.",
    ],
    kasse: "Leistung der gesetzlichen Krankenkasse, in der Regel bis zwölf Wochen nach der Geburt.",
    bild: neugeborenDecke,
    bildAlt: "Füße eines Neugeborenen in einer weißen Decke",
  },
  {
    id: "stillen",
    titel: "Stillberatung",
    kurz: "Anlegen, Milchmenge, wunde Brust – wir helfen beim guten Start und bei Fragen später.",
    text: [
      "Ob in den ersten Tagen oder Monate später: Wir begleiten dich beim Stillen, zeigen Anlegepositionen und helfen bei Schwierigkeiten wie wunden Brustwarzen, Milchstau oder Sorgen um die Gewichtszunahme.",
    ],
    kasse: "Leistung der gesetzlichen Krankenkasse, auch über das Wochenbett hinaus während der Stillzeit.",
    bild: stillenSessel,
    bildAlt: "Mutter hält ihr Baby im Arm",
  },
  {
    id: "rueckbildung",
    titel: "Rückbildung",
    kurz: "Beckenboden, Haltung und Kraft – Schritt für Schritt zurück in den Alltag.",
    text: [
      "Im Rückbildungskurs kräftigst du gezielt Beckenboden, Bauch und Rücken und kommst mit anderen Müttern ins Gespräch.",
    ],
    kasse: "Leistung der gesetzlichen Krankenkasse, wenn der Kurs bis zum Ende des neunten Monats nach der Geburt abgeschlossen ist.",
    bild: yogaSitzend,
    bildAlt: "Frau in einer Yoga-Übung auf der Matte",
    link: { text: "Zu den Kursen", href: "/kurse" },
  },
  {
    id: "beikost",
    titel: "Beikostberatung",
    kurz: "Wann starten, womit beginnen, worauf achten? Wir beraten zum Übergang auf Beikost.",
    text: [
      "Die Beikostberatung ist ein wichtiger Bestandteil der Hebammenarbeit. Wann ist der richtige Zeitpunkt, mit der Beikost zu starten, welche Art der Beikost eignet sich am besten für dein Baby und worauf musst du achten? Bei Bedarf beraten wir dich gern.",
    ],
    kasse: "Leistung der gesetzlichen Krankenkasse während der Stillzeit.",
    bild: beikostLoeffel,
    bildAlt: "Baby wird mit dem Löffel gefüttert",
  },
  {
    id: "individuell",
    titel: "Individuelle Leistungen",
    kurz: "Akupunktur, Kinesio-Taping, Homöopathie, Schwangerschaftsmassage und Trageberatung.",
    text: [
      "Jede Hebamme bietet individuelle Zusatzleistungen an. So können wir ganzheitlich betreuen und bei Bedarf an eine Kollegin weiterleiten. Dazu zählen Akupunktur, Kinesio-Taping, Homöopathie, Schwangerschaftsmassage und Trageberatung.",
    ],
    kasse: "Teilweise Selbstzahlerleistung – sprecht uns gern an.",
    bild: babyfuesseHaende,
    bildAlt: "Babyfüße in den Händen eines Elternteils",
  },
];

export const ZEITSTRAHL = [
  { phase: "Positiver Test", wann: "so früh wie möglich", text: "Meldet euch bei uns – am besten bis zur 12. Woche, denn Hebammen sind gefragt.", ziel: "/kontakt" },
  { phase: "Schwangerschaft", wann: "bis zur Geburt", text: "Vorsorge, Hilfe bei Beschwerden und Beratung zu allem, was euch beschäftigt.", ziel: "/leistungen#schwangerschaft" },
  { phase: "Geburtsvorbereitung", wann: "etwa ab der 25. Woche", text: "Kurs am Wochenende, gern mit Begleitperson – Schwangerschaftsyoga im Haus.", ziel: "/kurse" },
  { phase: "Wochenbett", wann: "die ersten Wochen", text: "Hausbesuche nach der Geburt: Baby, Stillen, Heilung und Ankommen als Familie.", ziel: "/leistungen#wochenbett" },
  { phase: "Erstes Lebensjahr", wann: "bis zum ersten Geburtstag", text: "Rückbildung, Babymassage, Beikostberatung und Krabbelkiste.", ziel: "/kurse" },
];

export type Kurs = { id: string; titel: string; untertitel: string; text: string; details: string[]; bild: ImageMetadata; bildAlt: string; pausiert?: boolean; extern?: { text: string; href: string } };

export const KURSE: Kurs[] = [
  {
    id: "geburtsvorbereitung",
    titel: "Ankommen im Leben",
    untertitel: "Geburtsvorbereitung intensiv",
    text: "In diesem Kurs erfährst du alles Wichtige über den Verlauf der Schwangerschaft, die verschiedenen Phasen der Geburt und die erste Zeit nach der Entbindung. Durch das vermittelte Wissen sowie praktische Übungen wollen wir euer Selbstvertrauen stärken und euch optimal auf eure Geburt und die erste Zeit mit eurem Baby vorbereiten.",
    details: ["Wochenendkurs, jeweils 10–14:45 Uhr", "Für Schwangere übernimmt die Krankenkasse die Kosten", "Begleitperson: 130 € (von den meisten Kassen erstattbar)"],
    bild: paarBauch,
    bildAlt: "Paar mit Händen auf dem Babybauch",
  },
  {
    id: "babymassage",
    titel: "Sanfte Hände",
    untertitel: "Babymassage für Wohlbefinden",
    text: "In diesem Kurs lernst du, wie du durch sanfte Berührungen die Gesundheit und das Wohlbefinden deines Babys fördern kannst. In entspannter Umgebung erlernst du Techniken, die eure Bindung stärken und die Entwicklung deines Babys unterstützen können. Dabei zeigen wir euch auch Handgriffe, die bei Schlafproblemen und Koliken helfen können.",
    details: ["Für Babys von 8 Wochen bis 6 Monaten"],
    bild: babymassageRuecken,
    bildAlt: "Baby auf dem Bauch bekommt eine Rückenmassage",
  },
  {
    id: "krabbelkiste",
    titel: "Krabbelkiste",
    untertitel: "Spiel und Spaß für Groß & Klein",
    text: "Dieser Kurs richtet sich an Eltern mit ihren Babys im Alter von 7 bis 11 Monaten und bietet eine wunderbare Gelegenheit, die Welt spielerisch zu entdecken. Das Kurskonzept greift Elemente der Montessori- und Pikler-Pädagogik auf und fördert durch eine vorbereitete Umgebung Selbstständigkeit und Selbstvertrauen.",
    details: ["Für Babys von 7 bis 11 Monaten"],
    bild: mutterNeugeborenSw,
    bildAlt: "Mutter mit Baby im Arm",
    pausiert: true,
  },
  {
    id: "schwangerschaftsyoga",
    titel: "Schwangerschaftsyoga",
    untertitel: "mit Stephanie Oretzki",
    text: "Schwangerschaftsyoga findet in regelmäßigen Abständen in unseren Kursräumen statt, geleitet von Stephanie Oretzki. Termine und Anmeldung findet ihr auf ihrer Website.",
    details: ["Partnerangebot in unseren Räumen"],
    bild: yogaSitzend,
    bildAlt: "Frau in einer Yoga-Übung auf der Matte",
    extern: { text: "Zur Website von Ostseeyoga", href: "http://ostseeyoga-mv.de/index.php" },
  },
];

/** Entwürfe – bitte von der Praxis prüfen lassen. */
export const FAQ = [
  {
    frage: "Wann sollte ich mich bei einer Hebamme melden?",
    antwort: "Am besten gleich nach dem positiven Schwangerschaftstest, spätestens bis zur 12. Woche. Hebammen sind vielerorts ausgebucht – je früher ihr euch meldet, desto sicherer bekommt ihr einen Platz für das Wochenbett.",
  },
  {
    frage: "Was kostet die Hebammenbetreuung?",
    antwort: "Für gesetzlich Versicherte übernimmt die Krankenkasse die Hebammenhilfe in Schwangerschaft, Wochenbett und Stillzeit sowie Geburtsvorbereitungs- und Rückbildungskurse. Privat Versicherte reichen die Rechnung bei ihrer Versicherung ein. Einzelne Zusatzleistungen wie Akupunktur oder Babymassage sind Selbstzahlerleistungen.",
  },
  {
    frage: "Kann ich die Vorsorge bei Hebamme und Frauenärztin kombinieren?",
    antwort: "Ja. Die Mutterschafts-Richtlinien erlauben die Vorsorge bei Hebamme und Frauenärztin – auch im Wechsel. Ultraschalluntersuchungen bleiben bei der Frauenarztpraxis.",
  },
  {
    frage: "Was passiert im Wochenbett?",
    antwort: "Wir besuchen euch nach der Geburt zu Hause, in den ersten Tagen täglich, danach nach Bedarf. Wir schauen nach Gewicht, Nabel und Haut des Babys, nach Rückbildung und Heilung bei dir, helfen beim Stillen und beantworten eure Fragen.",
  },
  {
    frage: "Kommt ihr auch zu mir nach Hause?",
    antwort: "Ja, Vorsorge und Wochenbettbetreuung finden in der Regel bei euch zu Hause statt. Wir betreuen Bad Doberan und Umgebung bis an den Rostocker Stadtrand. Wenn ihr unsicher seid, ob euer Ort dazugehört, fragt einfach nach.",
  },
  {
    frage: "Was kostet die Begleitperson im Geburtsvorbereitungskurs?",
    antwort: "Für Schwangere zahlt die Krankenkasse den Kurs. Für die Begleitperson fällt eine Teilnahmegebühr von 130 € an, die viele Krankenkassen ganz oder teilweise erstatten.",
  },
  {
    frage: "Was ist, wenn meine Hebamme Urlaub hat?",
    antwort: "Wir arbeiten als Team und vertreten uns gegenseitig. Ihr werdet auch im Urlaub oder Krankheitsfall weiter betreut.",
  },
];

/** Fußleiste wie auf der bisherigen Website */
export const FUSS_LEISTUNGEN = ["Schwangerschaftsvorsorge", "Schwangerschaftsmassage", "Wochenbettbetreuung", "Geburtsvorbereitungskurse", "Babymassagekurse", "Eltern-Kind-Kurse", "Akupunktur", "Kinesio-Taping"];

export const telLink = (t: string) => `tel:+49${t.replace(/\s/g, "").replace(/^0/, "")}`;
