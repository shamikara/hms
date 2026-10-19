/**
 * Deterministic conversation engine for the storefront assistant.
 *
 * This is not an LLM. Every reply is a pure function over the data below,
 * so there are no API calls, no latency, and no way for the assistant to
 * assert something the property has not verified. Anything outside
 * VERIFIED_FACTS routes to a human over WhatsApp rather than being guessed.
 *
 * Zero React imports by design — the widget only renders what this returns.
 */

/* ---------------------------------------------------------------- types */

export interface ChatOption {
  id: string;
  label: string;
}

export interface StayOption {
  id: string;
  name: string;
  sleeps: number;
  beds: string;
  view: string | null;
  tags: string[];
  features: string[];
}

/** The conversation's running state — the analogue of a cart. */
export interface Enquiry {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomId?: string;
}

export interface ChatContext {
  enquiry: Enquiry;
  /** Topics touched so far, carried into the handoff message. */
  topics: string[];
}

export interface ChatAnswer {
  text: string;
  options: ChatOption[];
  /** Rooms to render as cards beneath the reply. */
  rooms?: StayOption[];
  /** Show the "continue on WhatsApp" action. */
  handoff?: boolean;
}

/* ------------------------------------------------------------- catalogue */

/**
 * The three guestrooms, as recorded by the booking platforms.
 * Rates are deliberately absent: none have been verified, so the engine
 * never quotes a price.
 */
export const ROOMS: StayOption[] = [
  {
    id: "deluxe-double",
    name: "Deluxe Double Room",
    sleeps: 2,
    beds: "One queen bed",
    view: null,
    tags: ["couple", "two", "double", "queen", "solo", "small"],
    features: [
      "Air conditioning",
      "Private bathroom",
      "Desk and seating area",
      "Electric kettle",
      "Free Wi-Fi",
    ],
  },
  {
    id: "deluxe-quadruple",
    name: "Deluxe Quadruple Room",
    sleeps: 4,
    beds: "Two queen beds",
    view: "Pool view",
    tags: ["family", "four", "friends", "group", "pool", "quad"],
    features: [
      "Two queen beds",
      "Pool view",
      "Air conditioning",
      "Private bathroom",
      "Electric kettle",
      "Free Wi-Fi",
    ],
  },
  {
    id: "family-junior-suite",
    name: "Family Junior Suite",
    sleeps: 6,
    beds: "Two queen beds",
    view: "Garden view",
    tags: ["family", "six", "five", "children", "kids", "garden", "large", "group"],
    features: [
      "Two queen beds",
      "Sleeps up to six",
      "Garden view",
      "Air conditioning",
      "Private bathroom",
      "Free Wi-Fi",
    ],
  },
];

/** Guest needs, mapped to room-matching rules. */
export const NEEDS = [
  { id: "need-couple", label: "Just the two of us", tags: ["couple", "two"], guests: 2 },
  { id: "need-family", label: "Family with children", tags: ["family", "children", "garden"], guests: 4 },
  { id: "need-group", label: "Group of friends", tags: ["group", "friends"], guests: 4 },
  { id: "need-large", label: "Five or six of us", tags: ["six", "large", "family"], guests: 6 },
  { id: "need-pool", label: "Somewhere by the pool", tags: ["pool"], guests: 2 },
] as const;

/* ------------------------------------------------------- verified facts */

/**
 * Everything the assistant is permitted to state. Each entry is sourced
 * from the property's own listings. If a question falls outside this map,
 * the engine hands off rather than inventing an answer.
 */
const VERIFIED_FACTS: Record<string, string> = {
  pool: "There's an outdoor swimming pool in the garden, with loungers under a pergola. It's one of the things guests mention most.",
  breakfast:
    "Breakfast is continental, served between 7:30am and 10:00am. It's charged separately rather than included in the room rate.",
  food: "There's a restaurant on site and the kitchen cooks fresh Sri Lankan meals to order. Guests regularly single out the food in reviews.",
  wifi: "Free Wi-Fi throughout, and free private parking on site.",
  parking: "Free private parking on site, no booking needed.",
  frontdesk: "The front desk is staffed from 7:00am to 7:00pm daily.",
  aircon:
    "Every room is air-conditioned and has a private bathroom with complimentary toiletries and a hair dryer.",
  safari:
    "The house arranges safari jeeps into Udawalawe National Park — let the team know whether you'd prefer a morning or an afternoon drive and they'll organise a driver.",
  location:
    "We're on South Canal, Old Deewara Road, Udawalawa 70190, a short drive from the Udawalawe National Park entrance.",
  ratings:
    "Guests rate us 8.9/10 on Booking.com, 9.2/10 on Expedia, 9.1/10 on Hotels.com and 4.7/5 on Google.",
  housekeeping: "Housekeeping is available on request, and the team speak English.",
};

/** Free-text intent matching. First list to hit wins. */
const INTENTS: { id: string; keywords: string[] }[] = [
  {
    id: "rooms",
    keywords: [
      "room", "rooms", "stay", "suite", "double", "quadruple", "bed", "sleep",
      "accommodation", "availability", "available", "vacancy", "book", "booking", "reserve",
    ],
  },
  { id: "rates", keywords: ["price", "prices", "rate", "rates", "cost", "how much", "cheap", "expensive", "per night", "charge"] },
  { id: "breakfast", keywords: ["breakfast", "morning meal"] },
  { id: "food", keywords: ["food", "dinner", "lunch", "restaurant", "eat", "meal", "curry", "menu", "kitchen"] },
  { id: "pool", keywords: ["pool", "swim", "swimming", "lounger"] },
  { id: "safari", keywords: ["safari", "jeep", "elephant", "elephants", "park", "wildlife", "game drive", "animals"] },
  { id: "location", keywords: ["where", "location", "address", "directions", "far", "getting", "map", "distance", "airport"] },
  { id: "wifi", keywords: ["wifi", "wi-fi", "internet", "parking", "car"] },
  { id: "frontdesk", keywords: ["check in", "checkin", "check-in", "check out", "checkout", "front desk", "reception", "arrive", "arrival", "late"] },
  { id: "aircon", keywords: ["air con", "aircon", "air-conditioning", "bathroom", "towel", "toiletries", "hot water"] },
  { id: "ratings", keywords: ["review", "reviews", "rating", "ratings", "score", "recommend"] },
  { id: "human", keywords: ["human", "person", "staff", "someone", "talk", "speak", "call", "whatsapp", "agent", "manager"] },
  { id: "booking-ref", keywords: ["reference", "my booking", "confirmation", "reservation number"] },
];

/* ------------------------------------------------------------ menu sets */

export const MAIN_MENU: ChatOption[] = [
  { id: "rooms", label: "Rooms & availability" },
  { id: "safari", label: "Safari & the park" },
  { id: "food", label: "Food & breakfast" },
  { id: "location", label: "Getting here" },
  { id: "human", label: "Talk to the team" },
];

export const BACK: ChatOption[] = [{ id: "menu", label: "Back to menu" }];

/* -------------------------------------------------------------- scoring */

/**
 * Below this score a room is not worth suggesting, so the engine says
 * nothing rather than recommending something weak.
 */
export const RELEVANCE_FLOOR = 5;

function scoreRoom(room: StayOption, tags: readonly string[], guests?: number): number {
  let score = 0;
  for (const tag of tags) {
    if (room.tags.includes(tag)) score += 4;
  }
  if (typeof guests === "number") {
    // An exact capacity fit clears the floor on its own, so asking only
    // "a room for four" still returns the right room.
    if (room.sleeps === guests) score += 6;
    else if (room.sleeps > guests) score += 3;
    else score -= 6; // too small — actively the wrong answer
  }
  if (tags.includes("pool") && room.view === "Pool view") score += 3;
  if (tags.includes("garden") && room.view === "Garden view") score += 3;
  return score;
}

export function matchRooms(
  catalog: StayOption[],
  need: { tags: readonly string[]; guests?: number },
  limit = 3,
): StayOption[] {
  return catalog
    .map((room) => ({ room, score: scoreRoom(room, need.tags, need.guests) }))
    .filter((entry) => entry.score >= RELEVANCE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.room);
}

export function searchCatalog(catalog: StayOption[], query: string, limit = 3): StayOption[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  return catalog
    .map((room) => {
      const hay = [room.name, room.beds, room.view ?? "", room.tags.join(" "), room.features.join(" ")]
        .join(" ")
        .toLowerCase();
      const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 3 : 0), 0);
      return { room, score };
    })
    .filter((entry) => entry.score >= RELEVANCE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.room);
}

/* -------------------------------------------------------------- replies */

export function greeting(context: ChatContext): ChatAnswer {
  const guests = context.enquiry.guests;
  const opener = guests
    ? `Hello. I see you're looking for ${guests} ${guests === 1 ? "guest" : "guests"} — how can I help?`
    : "Hello, and welcome to Wildlily Safari Resort. I can answer questions about the rooms, the park and getting here. What would you like to know?";
  return { text: opener, options: MAIN_MENU };
}

function fact(id: string, options: ChatOption[] = BACK): ChatAnswer {
  return { text: VERIFIED_FACTS[id], options };
}

function unknown(): ChatAnswer {
  return {
    text: "I'm not sure about that one. I only answer from what the property has confirmed, so I'd rather not guess — the team can help.",
    options: MAIN_MENU,
    handoff: true,
  };
}

export function answer(nodeId: string, context: ChatContext): ChatAnswer {
  switch (nodeId) {
    case "menu":
      return { text: "What else can I help with?", options: MAIN_MENU };

    case "rooms": {
      // If the enquiry already names a party size, skip straight to the fit.
      const guests = context.enquiry.guests;
      if (typeof guests === "number") {
        const rooms = matchRooms(ROOMS, { tags: [], guests });
        if (rooms.length > 0) {
          return {
            text: `For ${guests} ${guests === 1 ? "guest" : "guests"}, these would suit:`,
            options: BACK,
            rooms,
          };
        }
      }
      return {
        text: "There are three rooms. Tell me who's travelling and I'll point you at the right one.",
        options: [...NEEDS.map((n) => ({ id: n.id, label: n.label })), ...BACK],
      };
    }

    case "rates":
      return {
        text: "Rates move with the season and the length of stay, so I'd rather not quote a number I can't stand behind. The team can give you an exact price straight away.",
        options: BACK,
        handoff: true,
      };

    case "safari":
      return { text: VERIFIED_FACTS.safari, options: BACK, handoff: true };

    case "food":
      return { text: `${VERIFIED_FACTS.food}\n\n${VERIFIED_FACTS.breakfast}`, options: BACK };

    case "location":
      return { text: `${VERIFIED_FACTS.location}\n\n${VERIFIED_FACTS.parking}`, options: BACK };

    case "breakfast":
      return fact("breakfast");
    case "pool":
      return fact("pool");
    case "wifi":
      return fact("wifi");
    case "parking":
      return fact("parking");
    case "frontdesk":
      return fact("frontdesk");
    case "aircon":
      return fact("aircon");
    case "ratings":
      return fact("ratings");
    case "housekeeping":
      return fact("housekeeping");

    case "booking-ref":
      return {
        text: "I can't look reservations up from here. The team has them to hand, though — send your reference across and they'll confirm it.",
        options: BACK,
        handoff: true,
      };

    case "human":
      return {
        text: "Of course. I'll pass across what we've covered so you don't have to repeat yourself.",
        options: BACK,
        handoff: true,
      };

    default: {
      const need = NEEDS.find((n) => n.id === nodeId);
      if (!need) return unknown();

      const rooms = matchRooms(ROOMS, { tags: need.tags, guests: need.guests });
      if (rooms.length === 0) {
        return {
          text: "None of the three rooms is a comfortable fit for that. The team can talk the options through with you.",
          options: BACK,
          handoff: true,
        };
      }
      return {
        text: rooms.length === 1 ? "This is the one I'd suggest:" : "These would suit:",
        options: BACK,
        rooms,
      };
    }
  }
}

export function understand(text: string, catalog: StayOption[]): ChatAnswer {
  const q = text.toLowerCase().trim();
  if (!q) return unknown();

  for (const intent of INTENTS) {
    if (intent.keywords.some((k) => q.includes(k))) {
      // A specific room question is better served by catalogue search.
      if (intent.id === "rooms") {
        const found = searchCatalog(catalog, q);
        if (found.length > 0) {
          return { text: "This looks like what you mean:", options: BACK, rooms: found };
        }
      }
      return answer(intent.id, { enquiry: {}, topics: [] });
    }
  }

  const found = searchCatalog(catalog, q);
  if (found.length > 0) {
    return { text: "This looks like what you mean:", options: BACK, rooms: found };
  }
  return unknown();
}

/* -------------------------------------------------------------- handoff */

/** Digits only — wa.me rejects +, spaces and dashes. */
export const WHATSAPP_NUMBER = "94777320237";

/**
 * Builds the message the guest arrives with, so the inbox gets context
 * instead of "hi".
 */
export function handoffMessage(topics: string[], enquiry: Enquiry): string {
  const lines = ["Hello — I was just on the Wildlily Safari Resort website."];

  if (topics.length > 0) {
    lines.push("", `I was looking at: ${topics.join(", ")}.`);
  }

  const details: string[] = [];
  if (enquiry.checkIn) details.push(`Check-in: ${enquiry.checkIn}`);
  if (enquiry.checkOut) details.push(`Check-out: ${enquiry.checkOut}`);
  if (enquiry.guests) details.push(`Guests: ${enquiry.guests}`);
  if (enquiry.roomId) {
    const room = ROOMS.find((r) => r.id === enquiry.roomId);
    if (room) details.push(`Room: ${room.name}`);
  }
  if (details.length > 0) lines.push("", ...details);

  lines.push("", "Could you help me with the details?");
  return lines.join("\n");
}

/**
 * Note: wa.me/message/<code> short links silently drop ?text=.
 * Only wa.me/<number> carries a prefilled message, so that form is used.
 */
export function whatsappHref(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
