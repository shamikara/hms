import { unstable_cache } from "next/cache";
import { SITE } from "@/lib/seo/site";
import { TAX_SETTING_KEY } from "@/features/billing/services/folio.service";
import { SiteRepository } from "../repositories/site.repository";
import {
  ContactSchema,
  RatingsSchema,
  type ContactValues,
  type RatingValues,
} from "../validations/site.schema";

export const CONTACT_KEY = "site.contact";
export const RATINGS_KEY = "site.ratings";

/** Cache tag for everything the public pages read from settings. */
export const SITE_CONTENT_TAG = "site-content";

export interface SiteRating extends RatingValues {
  /** The platform's own word for the score band, derived, never stored. */
  label: string;
}

export interface SiteContent {
  contact: ContactValues;
  ratings: SiteRating[];
  /** Pooled score on a 5-point scale, or null when no ratings are set. */
  aggregate: { value: number; count: number } | null;
}

/** What the site showed before settings existed; used until someone saves. */
const DEFAULT_CONTACT: ContactValues = {
  phone: SITE.phone,
  phoneDisplay: SITE.phoneDisplay,
  email: SITE.email,
  alertEmail: undefined,
  street: SITE.address.street,
  locality: SITE.address.locality,
  region: SITE.address.region,
  postalCode: SITE.address.postalCode,
};

const DEFAULT_RATINGS: RatingValues[] = [
  { platform: "Booking.com", score: 8.9, outOf: 10, count: 39 },
  { platform: "Google", score: 4.7, outOf: 5, count: 126 },
  { platform: "Hotels.com", score: 9.1, outOf: 10, count: 45 },
  { platform: "Expedia", score: 9.2, outOf: 10, count: 38 },
];

/** The band names the platforms themselves use, close enough to read right. */
function labelFor(score: number, outOf: number): string {
  const tenScale = (score / outOf) * 10;
  if (tenScale >= 9) return "Wonderful";
  if (tenScale >= 8.6) return "Fabulous";
  if (tenScale >= 8) return "Very good";
  if (tenScale >= 7) return "Good";
  return "Rated";
}

/** Review-count-weighted average, normalised to five. */
function aggregate(ratings: RatingValues[]): SiteContent["aggregate"] {
  const count = ratings.reduce((sum, r) => sum + r.count, 0);
  if (count === 0) return null;
  const weighted = ratings.reduce((sum, r) => sum + (r.score / r.outOf) * 5 * r.count, 0);
  return { value: Math.round((weighted / count) * 10) / 10, count };
}

function build(contact: ContactValues, ratings: RatingValues[]): SiteContent {
  return {
    contact,
    ratings: ratings.map((r) => ({ ...r, label: labelFor(r.score, r.outOf) })),
    aggregate: aggregate(ratings),
  };
}

export const DEFAULT_SITE_CONTENT = build(DEFAULT_CONTACT, DEFAULT_RATINGS);

/** Uncached read; exported for scripts and tests. Pages use getSiteContent. */
export async function loadSiteContent(): Promise<SiteContent> {
  const propertyId = await SiteRepository.defaultPropertyId();
  if (!propertyId) return DEFAULT_SITE_CONTENT;

  const settings = await SiteRepository.readSettings(propertyId, [CONTACT_KEY, RATINGS_KEY]);

  // A row that no longer validates (edited by hand, or an older shape) falls
  // back to the default for that section rather than breaking every page.
  const contact = ContactSchema.safeParse(settings.get(CONTACT_KEY));
  const ratings = RatingsSchema.safeParse(settings.get(RATINGS_KEY));

  return build(
    contact.success ? contact.data : DEFAULT_CONTACT,
    ratings.success ? ratings.data : DEFAULT_RATINGS,
  );
}

const cachedSiteContent = unstable_cache(loadSiteContent, ["site-content-v1"], {
  tags: [SITE_CONTENT_TAG],
  revalidate: 3600,
});

/**
 * Contact details and ratings for the public pages.
 *
 * Cached, and invalidated when an admin saves, so a page view does not cost a
 * database round trip. Never throws: if the database is unreachable (during a
 * build, say) the site shows its built-in details rather than an error page.
 */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    return await cachedSiteContent();
  } catch (error) {
    console.error("getSiteContent failed:", error instanceof Error ? error.message : error);
    return DEFAULT_SITE_CONTENT;
  }
}

export interface SiteSettings {
  propertyId: string;
  contact: ContactValues;
  ratings: RatingValues[];
  /** Null when not configured. */
  taxPercent: number | null;
}

export const SiteSettingsService = {
  /** Uncached read for the admin screen, including the tax rate. */
  async read(propertyId: string): Promise<SiteSettings> {
    const settings = await SiteRepository.readSettings(propertyId, [
      CONTACT_KEY,
      RATINGS_KEY,
      TAX_SETTING_KEY,
    ]);
    const contact = ContactSchema.safeParse(settings.get(CONTACT_KEY));
    const ratings = RatingsSchema.safeParse(settings.get(RATINGS_KEY));
    const rawTax = settings.get(TAX_SETTING_KEY);
    const tax = typeof rawTax === "number" ? rawTax : typeof rawTax === "string" ? Number(rawTax) : NaN;

    return {
      propertyId,
      contact: contact.success ? contact.data : DEFAULT_CONTACT,
      ratings: ratings.success ? ratings.data : DEFAULT_RATINGS,
      taxPercent: Number.isFinite(tax) && tax >= 0 ? tax : null,
    };
  },

  async saveContact(propertyId: string, contact: ContactValues) {
    // `undefined` does not survive JSON; store the blank explicitly as absent.
    const { alertEmail, ...rest } = contact;
    await SiteRepository.writeSetting(propertyId, CONTACT_KEY, alertEmail ? { ...rest, alertEmail } : rest);
  },

  async saveRatings(propertyId: string, ratings: RatingValues[]) {
    await SiteRepository.writeSetting(propertyId, RATINGS_KEY, ratings);
  },

  async saveTax(propertyId: string, taxPercent: number | null) {
    if (taxPercent === null) {
      await SiteRepository.deleteSetting(propertyId, TAX_SETTING_KEY);
    } else {
      await SiteRepository.writeSetting(propertyId, TAX_SETTING_KEY, taxPercent);
    }
  },
};
