import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import { getPublicRooms } from "@/features/rooms/services/public-rooms.service";

/**
 * schema.org structured data for the property.
 *
 * LodgingBusiness is what Google reads for accommodation: it is what puts the
 * address, geo point, star rating and contact details into the knowledge panel
 * and makes the property eligible for rich results.
 *
 * Every value here is a verified fact. Contact details and aggregateRating
 * come from Site Settings; the rating pools the booking platforms' published
 * scores — inventing or inflating it is a manual-action risk, not just bad
 * manners.
 */
export async function OrganizationJsonLd() {
  const [{ contact, aggregate }, rooms] = await Promise.all([getSiteContent(), getPublicRooms()]);

  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_URL}/#lodging`,
    name: SITE.name,
    alternateName: [...SITE.alternateNames],
    description: SITE.description,
    url: SITE_URL,
    telephone: contact.phone,
    email: contact.email,
    image: `${SITE_URL}${SITE.ogImage}`,
    logo: `${SITE_URL}/brand/logo-512.png`,
    priceRange: "$$",
    currenciesAccepted: "LKR",
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.street,
      addressLocality: contact.locality,
      addressRegion: contact.region,
      postalCode: contact.postalCode,
      addressCountry: SITE.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    ...(aggregate && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: aggregate.value,
        reviewCount: aggregate.count,
        bestRating: 5,
      },
    }),
    amenityFeature: SITE.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    ...(rooms && rooms.totalSellableRooms > 0 && { numberOfRooms: rooms.totalSellableRooms }),
    petsAllowed: false,
    nearbyAttractions: {
      "@type": "TouristAttraction",
      name: "Udawalawe National Park",
    },
  };

  return (
    <script
      type="application/ld+json"
      // Values come from validated settings, and JSON.stringify output is
      // escaped below so a stray "</script>" in a field cannot end the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Breadcrumb trail for an inner page, so search results show the hierarchy. */
export function BreadcrumbJsonLd({
  trail,
}: {
  trail: { name: string; path: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
