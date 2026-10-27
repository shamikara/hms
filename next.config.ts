import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * `script-src` allows `'unsafe-inline'` rather than a nonce, and that is a
 * deliberate trade-off: nonces have to be minted per request, which forces
 * every page into dynamic rendering. The public pages are a static marketing
 * site served to visitors on Sri Lankan mobile data, and making them all
 * render per request to harden against an injection vector the site does not
 * currently have is the wrong bargain.
 *
 * What the policy still buys, all of which holds with `'unsafe-inline'`:
 * `frame-ancestors` stops the booking form being framed and clickjacked,
 * `form-action` stops an injected form posting the guest's details elsewhere,
 * `base-uri` stops an injected <base> redirecting every relative URL, and
 * `object-src 'none'` closes the plugin vector entirely.
 *
 * If a third-party script is ever added — analytics, a chat widget, a payment
 * gateway — it needs its origin listed here, and that is the moment to weigh
 * moving to a nonce in `proxy.ts` instead.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed by React's development error overlay.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind, Radix, GSAP, framer-motion and Lenis all write inline styles.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Server actions post to the same origin; ws: is the dev hot reloader.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  // The map embeds on the contact page and the landing page.
  "frame-src https://maps.google.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** Applied to every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Backs up frame-ancestors for browsers that predate CSP level 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site asks for none of these, so refuse them outright.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(isDev
    ? // Sending HSTS over plain http://localhost pins the whole localhost
      // origin to https in the browser, which breaks every other local
      // project on the machine until the user clears it by hand.
      []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Announcing the framework and its version tells an attacker which
  // advisories to try. It buys nothing in return.
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-pg", "pg", "@prisma/client"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // robots.txt asks crawlers to stay out of the operations area, but a
        // request that arrives anyway — a stray link, a bot ignoring the file
        // — still gets an explicit refusal to index.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  images: {
    /*
     * next/image refuses any remote host not listed here. Driver photos,
     * vehicle images and fleet documents are stored as external URLs, so the
     * hosts that serve them have to be allowed explicitly.
     */
    remotePatterns: [
      // Supabase Storage — public bucket URLs.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Generated initials avatars used by the sample driver seed.
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/api/**" },
    ],
  },
};

export default nextConfig;
