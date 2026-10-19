import type { Metadata } from "next";

/**
 * The contact page is a client component (it holds form state), so it cannot
 * export metadata itself. This route layout supplies it instead.
 */
export const metadata: Metadata = {
  title: "Contact & Directions",
  description:
    "Find Wildlily Safari Resort on Old Deewara Road, Udawalawa — phone, email, map and directions from the national park entrance.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact & Directions",
    description:
      "Find Wildlily Safari Resort on Old Deewara Road, Udawalawa — phone, email, map and directions.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
