/**
 * Single source of truth for the property's public identity.
 *
 * Metadata, structured data and the sitemap all read from here, so the name,
 * address and contact details are stated once.
 *
 * NAMING: the site brand is "Wildlily Safari Resort", matching the registered
 * domain. The booking platforms still file this property under its earlier
 * names — "Lily Resort Udawalawe", latterly "Lily Safari Resort Udawalwa" —
 * and every review and citation it has sits under those. They are carried in
 * `alternateName` so a search for the old name can still resolve here.
 */

/**
 * Canonical origin. Includes the `www.` host because that is what the site
 * actually serves; a mismatch here splits canonical signals between hosts.
 * Override with NEXT_PUBLIC_SITE_URL per environment.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wildlilysafariresort.com";

export const SITE = {
  name: "Wildlily Safari Resort",
  /** Earlier/platform names, surfaced to search engines for continuity. */
  alternateNames: [
    "Lily Safari Resort Udawalwa",
    "Lily Resort Udawalawe",
  ],
  url: SITE_URL,
  description:
    "A small guesthouse beside Udawalawe National Park with three air-conditioned rooms, an outdoor pool, home-cooked Sri Lankan food and safari jeeps arranged by the house.",
  email: "reservations@wildlilysafariresort.com",
  phone: "+94777320237",
  phoneDisplay: "+94 77 732 0237",
  address: {
    street: "South Canal, Old Deewara Road",
    locality: "Udawalawa",
    region: "Sabaragamuwa Province",
    postalCode: "70190",
    country: "LK",
  },
  geo: { latitude: 6.420229, longitude: 80.83551 },
  /**
   * Platform scores normalised to a 5-point scale and pooled:
   * Booking 8.9/39, Expedia 9.2/38, Hotels.com 9.1/45, Google 4.7/126.
   */
  rating: { value: 4.6, count: 248, best: 5 },
  amenities: [
    "Outdoor swimming pool",
    "Free Wi-Fi",
    "Free private parking",
    "Restaurant",
    "Air conditioning",
    "Safari jeep booking",
  ],
  /** Default social preview image, relative to the site root. */
  ogImage: "/og-image.jpg",
} as const;

/** Pages included in the sitemap, with their relative crawl priority. */
export const SITE_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/rooms", priority: 0.9, changeFrequency: "monthly" },
  { path: "/book", priority: 0.9, changeFrequency: "monthly" },
  { path: "/safari", priority: 0.8, changeFrequency: "monthly" },
  { path: "/safari/drivers", priority: 0.7, changeFrequency: "weekly" },
  { path: "/dining", priority: 0.7, changeFrequency: "monthly" },
  { path: "/packages", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/sustainability", priority: 0.5, changeFrequency: "yearly" },
];
