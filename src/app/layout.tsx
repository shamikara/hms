import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { SITE, SITE_URL } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Required for Open Graph and canonical URLs to resolve to absolute links.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} | Guesthouse & Safari beside Udawalawe National Park`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "Udawalawe hotel",
    "Udawalawe National Park accommodation",
    "safari guesthouse Sri Lanka",
    "Udawalawe safari jeep",
    "Wildlily Safari Resort",
    ...SITE.alternateNames,
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} | Guesthouse & Safari beside Udawalawe National Park`,
    description: SITE.description,
    url: SITE_URL,
    locale: "en_GB",
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: "The pool at Wildlily Safari Resort at dusk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd />
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
