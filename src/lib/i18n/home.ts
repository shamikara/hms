/**
 * Homepage copy in English, German and French.
 *
 * Only the homepage, header and footer are translated; inner pages stay in
 * English. The German and French homepages live at /de and /fr so Google can
 * index each one and show it to the right searchers (hreflang).
 *
 * Strings only, no functions, because some of this is handed to client
 * components. `{n}`-style placeholders are filled with `fill()`.
 */

export const LOCALES = ["en", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_PATH: Record<Locale, string> = { en: "/", de: "/de", fr: "/fr" };
export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", de: "DE", fr: "FR" };
export const LOCALE_NAME: Record<Locale, string> = { en: "English", de: "Deutsch", fr: "Français" };

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

const en = {
  meta: {
    title: "Lily Safari Resort | Guesthouse by Udawalawe National Park, Sri Lanka",
    description:
      "A small, family-run guesthouse beside Udawalawe National Park with a pool, home-cooked Sri Lankan food and safari jeeps arranged by the house. Book direct.",
  },
  nav: {
    about: "About",
    rooms: "Rooms",
    safari: "Safari",
    food: "Food",
    guide: "Guide",
    contact: "Contact",
    account: "Account",
    home: "Home",
    bookDirect: "Book Direct & Save",
    signIn: "Sign in or create an account",
    nearPark: "A short drive from Udawalawe National Park",
    language: "Language",
  },
  hero: {
    eyebrow: "Udawalawe · Sri Lanka",
    lead: "A small, family-run guesthouse beside Udawalawe National Park, with a pool in the garden, home-cooked food and safari jeeps arranged by the house.",
    reviews: "<b>{value}</b> / 5 from {count} guest reviews",
  },
  widget: {
    checkIn: "Check in",
    checkOut: "Check out",
    guests: "Guests",
    adult: "adult",
    adults: "adults",
    cta: "Check availability",
  },
  highlights: {
    eyebrow: "Why stay with us",
    title: "Small, friendly and right by the park",
    intro: "A family-run guesthouse with a handful of rooms, where the team knows your name by the second morning.",
    items: [
      { title: "Close to the park", text: "A short drive to the Udawalawe National Park entrance, so a dawn safari is an early start, not a long one." },
      { title: "A pool in the garden", text: "Loungers under the trees for the hot middle of the day, and lit up after dark." },
      { title: "Home-cooked food", text: "Sri Lankan rice and curry, grills and breakfast on the verandah, cooked to order." },
      { title: "Evenings by the fire", text: "A campfire and string lights in the garden once the jeeps are back." },
    ],
  },
  walk: {
    eyebrow: "Take a walk around",
    title: "See the place before you arrive",
    intro: "Short clips from around the garden, rooms and pool, filmed at the resort.",
    play: "Play video",
    close: "Close video",
    clips: [
      { title: "Courtyard to the pool", note: "From the rooms, under the mango trees" },
      { title: "The upstairs verandah", note: "Looking down on the garden and pool" },
      { title: "The garden path", note: "Past the rooms and out to the pool" },
    ],
  },
  rooms: {
    eyebrow: "Rooms",
    title: "Somewhere cool to come back to",
    intro: "{n} air-conditioned {rooms}, spotless, each with its own bathroom.",
    room: "room",
    roomsWord: "rooms",
    allDetails: "All room details",
    sleeps: "Sleeps {n}",
    onRequest: "Rates on request",
    perNight: "/ night",
    checkDates: "Check dates",
  },
  safari: {
    eyebrow: "Safari",
    title: "Into Udawalawe with drivers who know it",
    intro: "Udawalawe is one of the best places in Sri Lanka to see wild elephants, often in large family herds. We arrange the jeep and the driver, and you are at the gate soon after it opens.",
    points: [
      "Open safari jeeps and drivers arranged by the house",
      "Early-morning drives, when the animals are out",
      "Elephant herds, birdlife, and with luck a leopard",
    ],
    drives: "Safari drives",
    drivers: "Meet the drivers",
    guide: "Local guide & FAQs",
  },
  food: {
    eyebrow: "Food & evenings",
    title: "Rice and curry, then the fire",
    intro: "Breakfast on the verandah and dinners of Sri Lankan rice and curry or grills, cooked to order. After dark the pool lights up and there is a fire in the garden.",
    link: "Food at the house",
  },
  photos: {
    eyebrow: "Around the house",
    title: "The garden, the park, the birds",
    label: "Photographs of the guesthouse and the park",
  },
  ratings: {
    eyebrow: "Guest ratings",
    title: "What guests say",
    average: "An average of <b>{value} out of 5</b> across {count} reviews on the sites our guests book through.",
    reviews: "reviews",
  },
  location: {
    eyebrow: "Location",
    title: "Find us in Udawalawe",
    intro: "A short drive from the national park entrance, so a morning drive means an early start rather than a long one.",
    gettingHere: "Getting here",
    gettingHereText: "Roughly four to five hours by road from Bandaranaike International Airport (CMB), depending on traffic. Ask us and we will tell you the best route, or help you find a driver.",
    mapTitle: "Map showing the location of Lily Safari Resort",
  },
  cta: {
    title: "Come and stay by the park",
    text: "Pick your dates and we will hold a room while we confirm with you. Questions first? Call or message us.",
    button: "Check availability",
  },
  footer: {
    blurb: "A small guesthouse beside Udawalawe National Park with air-conditioned rooms, an outdoor pool, home-cooked Sri Lankan food and safari jeeps arranged by the house.",
    explore: "Explore",
    about: "About the House",
    rooms: "Rooms",
    safari: "Safari Drives",
    drivers: "Meet the Drivers",
    food: "Food & Breakfast",
    guide: "Local Guide & FAQs",
    contact: "Contact",
    contactDesk: "Contact Desk",
    account: "Your Account",
    accountText: "See your bookings in one place, and rate your safari driver after a drive.",
    signIn: "Sign In",
    register: "New here? Create an account",
    rights: "All rights reserved.",
    builtWith: "Built with",
    by: "by",
    englishOnly: "",
  },
};

export type HomeDict = typeof en;

const de: HomeDict = {
  meta: {
    title: "Lily Safari Resort | Gästehaus am Udawalawe-Nationalpark, Sri Lanka",
    description:
      "Ein kleines, familiengeführtes Gästehaus direkt am Udawalawe-Nationalpark mit Pool, hausgemachter srilankischer Küche und Safari-Jeeps, die wir für Sie organisieren. Direkt buchen.",
  },
  nav: {
    about: "Über uns",
    rooms: "Zimmer",
    safari: "Safari",
    food: "Essen",
    guide: "Reiseinfos",
    contact: "Kontakt",
    account: "Konto",
    home: "Start",
    bookDirect: "Direkt buchen & sparen",
    signIn: "Anmelden oder Konto erstellen",
    nearPark: "Nur eine kurze Fahrt zum Udawalawe-Nationalpark",
    language: "Sprache",
  },
  hero: {
    eyebrow: "Udawalawe · Sri Lanka",
    lead: "Ein kleines, familiengeführtes Gästehaus am Udawalawe-Nationalpark – mit Pool im Garten, hausgemachtem Essen und Safari-Jeeps, die wir für Sie organisieren.",
    reviews: "<b>{value}</b> / 5 aus {count} Gästebewertungen",
  },
  widget: {
    checkIn: "Anreise",
    checkOut: "Abreise",
    guests: "Gäste",
    adult: "Erwachsener",
    adults: "Erwachsene",
    cta: "Verfügbarkeit prüfen",
  },
  highlights: {
    eyebrow: "Warum bei uns",
    title: "Klein, herzlich und direkt am Park",
    intro: "Ein Familienbetrieb mit nur wenigen Zimmern – spätestens am zweiten Morgen kennt das Team Ihren Namen.",
    items: [
      { title: "Nah am Park", text: "Nur eine kurze Fahrt zum Eingang des Udawalawe-Nationalparks: Eine Safari im Morgengrauen bedeutet frühes Aufstehen, aber keine lange Anfahrt." },
      { title: "Ein Pool im Garten", text: "Liegen im Schatten der Bäume für die heiße Mittagszeit – und abends beleuchtet." },
      { title: "Hausgemachtes Essen", text: "Srilankisches Reis und Curry, Gegrilltes und Frühstück auf der Veranda, frisch zubereitet." },
      { title: "Abende am Feuer", text: "Lagerfeuer und Lichterketten im Garten, sobald die Jeeps zurück sind." },
    ],
  },
  walk: {
    eyebrow: "Ein kleiner Rundgang",
    title: "Sehen Sie sich vorher um",
    intro: "Kurze Videos aus Garten, Zimmern und Pool, direkt bei uns gefilmt.",
    play: "Video abspielen",
    close: "Video schließen",
    clips: [
      { title: "Vom Innenhof zum Pool", note: "Von den Zimmern unter den Mangobäumen hindurch" },
      { title: "Die obere Veranda", note: "Mit Blick auf Garten und Pool" },
      { title: "Der Gartenweg", note: "An den Zimmern vorbei zum Pool" },
    ],
  },
  rooms: {
    eyebrow: "Zimmer",
    title: "Ein kühler Ort zum Zurückkommen",
    intro: "{n} klimatisierte {rooms}, blitzsauber, jedes mit eigenem Bad.",
    room: "Zimmer",
    roomsWord: "Zimmer",
    allDetails: "Alle Zimmerdetails",
    sleeps: "Für {n} Personen",
    onRequest: "Preis auf Anfrage",
    perNight: "/ Nacht",
    checkDates: "Termine prüfen",
  },
  safari: {
    eyebrow: "Safari",
    title: "Nach Udawalawe mit Fahrern, die den Park kennen",
    intro: "Udawalawe ist einer der besten Orte Sri Lankas, um wilde Elefanten zu sehen, oft in großen Familienherden. Wir organisieren Jeep und Fahrer, und Sie sind kurz nach der Öffnung am Tor.",
    points: [
      "Offene Safari-Jeeps und Fahrer, von uns organisiert",
      "Fahrten am frühen Morgen, wenn die Tiere unterwegs sind",
      "Elefantenherden, Vögel und mit etwas Glück ein Leopard",
    ],
    drives: "Safari-Touren",
    drivers: "Unsere Fahrer",
    guide: "Reiseinfos & FAQ (Englisch)",
  },
  food: {
    eyebrow: "Essen & Abende",
    title: "Reis und Curry, dann das Feuer",
    intro: "Frühstück auf der Veranda und abends srilankisches Reis und Curry oder Gegrilltes, frisch zubereitet. Nach Einbruch der Dunkelheit leuchtet der Pool und im Garten brennt ein Feuer.",
    link: "Essen im Haus",
  },
  photos: {
    eyebrow: "Rund ums Haus",
    title: "Der Garten, der Park, die Vögel",
    label: "Fotos des Gästehauses und des Parks",
  },
  ratings: {
    eyebrow: "Gästebewertungen",
    title: "Was unsere Gäste sagen",
    average: "Durchschnittlich <b>{value} von 5</b> aus {count} Bewertungen auf den Portalen, über die unsere Gäste buchen.",
    reviews: "Bewertungen",
  },
  location: {
    eyebrow: "Lage",
    title: "So finden Sie uns in Udawalawe",
    intro: "Nur eine kurze Fahrt vom Parkeingang entfernt – eine Morgensafari heißt früh aufstehen, nicht lange fahren.",
    gettingHere: "Anreise",
    gettingHereText: "Etwa vier bis fünf Stunden Fahrt vom Flughafen Colombo (CMB), je nach Verkehr. Fragen Sie uns nach der besten Route – wir helfen auch gern, einen Fahrer zu finden.",
    mapTitle: "Karte mit der Lage des Lily Safari Resort",
  },
  cta: {
    title: "Wohnen Sie bei uns am Park",
    text: "Wählen Sie Ihre Daten, und wir halten ein Zimmer für Sie frei, während wir mit Ihnen bestätigen. Erst Fragen? Rufen Sie an oder schreiben Sie uns.",
    button: "Verfügbarkeit prüfen",
  },
  footer: {
    blurb: "Ein kleines Gästehaus am Udawalawe-Nationalpark mit klimatisierten Zimmern, Außenpool, hausgemachter srilankischer Küche und Safari-Jeeps, die wir für Sie organisieren.",
    explore: "Entdecken",
    about: "Über das Haus",
    rooms: "Zimmer",
    safari: "Safari-Touren",
    drivers: "Unsere Fahrer",
    food: "Essen & Frühstück",
    guide: "Reiseinfos & FAQ",
    contact: "Kontakt",
    contactDesk: "Rezeption",
    account: "Ihr Konto",
    accountText: "Alle Buchungen an einem Ort – und bewerten Sie Ihren Safari-Fahrer nach der Tour.",
    signIn: "Anmelden",
    register: "Neu hier? Konto erstellen",
    rights: "Alle Rechte vorbehalten.",
    builtWith: "Erstellt mit",
    by: "von",
    englishOnly: "Die weiteren Seiten sind auf Englisch.",
  },
};

const fr: HomeDict = {
  meta: {
    title: "Lily Safari Resort | Maison d'hôtes près du parc national d'Udawalawe, Sri Lanka",
    description:
      "Une petite maison d'hôtes familiale à côté du parc national d'Udawalawe, avec piscine, cuisine sri-lankaise maison et jeeps de safari organisées par la maison. Réservez en direct.",
  },
  nav: {
    about: "La maison",
    rooms: "Chambres",
    safari: "Safari",
    food: "Cuisine",
    guide: "Guide",
    contact: "Contact",
    account: "Compte",
    home: "Accueil",
    bookDirect: "Réserver en direct",
    signIn: "Se connecter ou créer un compte",
    nearPark: "À quelques minutes du parc national d'Udawalawe",
    language: "Langue",
  },
  hero: {
    eyebrow: "Udawalawe · Sri Lanka",
    lead: "Une petite maison d'hôtes familiale à côté du parc national d'Udawalawe, avec une piscine dans le jardin, une cuisine maison et des jeeps de safari organisées par nos soins.",
    reviews: "<b>{value}</b> / 5 sur {count} avis de voyageurs",
  },
  widget: {
    checkIn: "Arrivée",
    checkOut: "Départ",
    guests: "Voyageurs",
    adult: "adulte",
    adults: "adultes",
    cta: "Voir les disponibilités",
  },
  highlights: {
    eyebrow: "Pourquoi séjourner chez nous",
    title: "Petite, chaleureuse et tout près du parc",
    intro: "Une maison familiale de quelques chambres, où l'équipe connaît votre prénom dès le deuxième matin.",
    items: [
      { title: "Tout près du parc", text: "À quelques minutes de l'entrée du parc national d'Udawalawe : un safari à l'aube, c'est se lever tôt, pas rouler longtemps." },
      { title: "Une piscine au jardin", text: "Des transats à l'ombre des arbres pour les heures chaudes, et une piscine illuminée le soir." },
      { title: "Cuisine maison", text: "Riz et curry sri-lankais, grillades et petit-déjeuner sur la véranda, préparés à la demande." },
      { title: "Soirées au coin du feu", text: "Un feu de camp et des guirlandes lumineuses au jardin, une fois les jeeps rentrées." },
    ],
  },
  walk: {
    eyebrow: "Petite visite",
    title: "Découvrez les lieux avant d'arriver",
    intro: "De courtes vidéos du jardin, des chambres et de la piscine, filmées sur place.",
    play: "Lire la vidéo",
    close: "Fermer la vidéo",
    clips: [
      { title: "De la cour à la piscine", note: "Depuis les chambres, sous les manguiers" },
      { title: "La véranda à l'étage", note: "Vue plongeante sur le jardin et la piscine" },
      { title: "L'allée du jardin", note: "Le long des chambres jusqu'à la piscine" },
    ],
  },
  rooms: {
    eyebrow: "Chambres",
    title: "Un endroit frais où revenir",
    intro: "{n} {rooms} climatisées, impeccables, chacune avec sa salle de bains.",
    room: "chambre",
    roomsWord: "chambres",
    allDetails: "Toutes les chambres",
    sleeps: "{n} personnes",
    onRequest: "Tarif sur demande",
    perNight: "/ nuit",
    checkDates: "Voir les dates",
  },
  safari: {
    eyebrow: "Safari",
    title: "Udawalawe avec des chauffeurs qui connaissent le parc",
    intro: "Udawalawe est l'un des meilleurs endroits du Sri Lanka pour voir des éléphants sauvages, souvent en grands troupeaux familiaux. Nous organisons la jeep et le chauffeur, et vous êtes à l'entrée peu après l'ouverture.",
    points: [
      "Jeeps de safari ouvertes et chauffeurs organisés par la maison",
      "Sorties tôt le matin, quand les animaux sont actifs",
      "Troupeaux d'éléphants, oiseaux et, avec de la chance, un léopard",
    ],
    drives: "Les safaris",
    drivers: "Nos chauffeurs",
    guide: "Guide pratique & FAQ (anglais)",
  },
  food: {
    eyebrow: "Cuisine & soirées",
    title: "Riz et curry, puis le feu de camp",
    intro: "Petit-déjeuner sur la véranda et dîners de riz et curry sri-lankais ou de grillades, préparés à la demande. À la nuit tombée, la piscine s'illumine et un feu crépite au jardin.",
    link: "La cuisine de la maison",
  },
  photos: {
    eyebrow: "Autour de la maison",
    title: "Le jardin, le parc, les oiseaux",
    label: "Photos de la maison d'hôtes et du parc",
  },
  ratings: {
    eyebrow: "Avis des voyageurs",
    title: "Ce qu'en disent nos hôtes",
    average: "Une moyenne de <b>{value} sur 5</b> sur {count} avis publiés sur les sites où nos hôtes réservent.",
    reviews: "avis",
  },
  location: {
    eyebrow: "Accès",
    title: "Nous trouver à Udawalawe",
    intro: "À quelques minutes de l'entrée du parc national : un safari du matin, c'est se lever tôt plutôt que rouler longtemps.",
    gettingHere: "Venir chez nous",
    gettingHereText: "Environ quatre à cinq heures de route depuis l'aéroport international de Colombo (CMB), selon la circulation. Demandez-nous le meilleur itinéraire, ou de l'aide pour trouver un chauffeur.",
    mapTitle: "Carte indiquant l'emplacement du Lily Safari Resort",
  },
  cta: {
    title: "Venez séjourner près du parc",
    text: "Choisissez vos dates : nous vous réservons une chambre le temps de confirmer avec vous. Une question d'abord ? Appelez-nous ou écrivez-nous.",
    button: "Voir les disponibilités",
  },
  footer: {
    blurb: "Une petite maison d'hôtes à côté du parc national d'Udawalawe : chambres climatisées, piscine extérieure, cuisine sri-lankaise maison et jeeps de safari organisées par nos soins.",
    explore: "Découvrir",
    about: "La maison",
    rooms: "Chambres",
    safari: "Les safaris",
    drivers: "Nos chauffeurs",
    food: "Cuisine & petit-déjeuner",
    guide: "Guide pratique & FAQ",
    contact: "Contact",
    contactDesk: "Réception",
    account: "Votre compte",
    accountText: "Retrouvez vos réservations au même endroit et notez votre chauffeur après le safari.",
    signIn: "Se connecter",
    register: "Nouveau ? Créer un compte",
    rights: "Tous droits réservés.",
    builtWith: "Réalisé avec",
    by: "par",
    englishOnly: "Les autres pages sont en anglais.",
  },
};

export const HOME: Record<Locale, HomeDict> = { en, de, fr };
