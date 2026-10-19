import { SITE, SITE_URL } from "@/lib/seo/site";

/**
 * schema.org structured data for the property.
 *
 * LodgingBusiness is what Google reads for accommodation: it is what puts the
 * address, geo point, star rating and contact details into the knowledge panel
 * and makes the property eligible for rich results.
 *
 * Every value here is a verified fact. aggregateRating pools the four booking
 * platforms' published scores — inventing or inflating it is a manual-action
 * risk, not just bad manners.
 */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_URL}/#lodging`,
    name: SITE.name,
    alternateName: [...SITE.alternateNames],
    description: SITE.description,
    url: SITE_URL,
    telephone: SITE.phone,
    email: SITE.email,
    image: `${SITE_URL}${SITE.ogImage}`,
    priceRange: "$$",
    currenciesAccepted: "LKR",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SITE.rating.value,
      reviewCount: SITE.rating.count,
      bestRating: SITE.rating.best,
    },
    amenityFeature: SITE.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    numberOfRooms: 3,
    petsAllowed: false,
    nearbyAttractions: {
      "@type": "TouristAttraction",
      name: "Udawalawe National Park",
    },
  };

  return (
    <script
      type="application/ld+json"
      // Values come from a local constant, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
