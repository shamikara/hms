import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Bus, Car, Clock, MapPin, Sun, Ticket } from "lucide-react";
import { getSiteContent } from "@/features/site/services/site.service";

const DESCRIPTION =
  "Udawalawe local guide: the best time to see elephants, national park opening hours and entry fees, the Elephant Transit Home, and how to get here from Colombo, Ella and the south coast.";

export const metadata: Metadata = {
  title: "Udawalawe Local Guide & FAQs",
  description: DESCRIPTION,
  alternates: { canonical: "/guide" },
  openGraph: { title: "Udawalawe Local Guide & FAQs", description: DESCRIPTION, url: "/guide" },
};

export const revalidate = 3600;

/**
 * Prices and times change, and the sources disagree a little, so everything
 * here is written as "about" and points guests back to the desk. Keep the
 * answers plain text: they are reused word for word in the FAQ structured data.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: "When is the best time to see elephants in Udawalawe?",
    a: "Any time of year. Udawalawe has elephants all year round, which is why it is the most reliable park in Sri Lanka for them. In the drier months (roughly May to September) herds gather near the reservoir and are easier to find. Calves are seen often, especially from about October to January.",
  },
  {
    q: "Morning or afternoon safari?",
    a: "Both are good. The park opens at 6:00am and closes at 6:00pm. A morning drive (about 6:00 to 10:00am) has cool air, soft light and active animals. An afternoon drive (about 2:30 to 6:00pm) catches elephants coming to the water in golden light. Midday is hot and quieter. A half-day drive is about 3 to 4 hours.",
  },
  {
    q: "How much are the Udawalawe National Park entry fees?",
    a: "For foreign adults, the gate ticket (with VAT, service charge and vehicle fee) is roughly USD 40 to 45 for one person, and cheaper per person in a group. Children aged 6 to 12 pay about half, and children under 6 are free. Sri Lankan residents pay much less. The jeep and driver are paid separately. Fees change from time to time, so ask us for today's prices.",
  },
  {
    q: "How much does a safari jeep cost?",
    a: "A jeep with driver for a half-day is usually about LKR 8,000 to 15,000 for the whole jeep (up to about 6 people), and more for a full day. We book jeeps with drivers we know and trust. Ask at the desk or add a safari when you book, and we'll confirm the price before you go.",
  },
  {
    q: "What is the Elephant Transit Home?",
    a: "A rehabilitation centre beside the park, run by the Department of Wildlife Conservation since 1995, that raises orphaned baby elephants and returns them to the wild. You watch the milk feedings from a viewing platform; there is no touching or riding. Feeding times are several times a day and change now and then, so ask us for the times on the day.",
  },
  {
    q: "How do I get to Udawalawe from Colombo?",
    a: "Udawalawe is about 175 to 180 km from Colombo. By car or taxi it takes about 3.5 to 4 hours using the Southern Expressway. The direct bus takes about 5 hours. From Bandaranaike International Airport allow about 4.5 to 5 hours by car. We can help arrange a driver.",
  },
  {
    q: "How do I get to Udawalawe from Ella?",
    a: "About 2 to 2.5 hours by car or tuk-tuk, through Wellawaya. By bus, change at Wellawaya or Thanamalwila; allow 3 to 4 hours. Many guests come from Ella after the train ride through the hills.",
  },
  {
    q: "How far is the south coast?",
    a: "Tangalle is about 1.5 to 2 hours away, and Mirissa and Galle about 2 to 3 hours, so Udawalawe fits well between the hills and the beaches.",
  },
  {
    q: "What should I bring on safari?",
    a: "A hat, sunscreen, water, a light layer for the early morning, and binoculars or a zoom camera if you have them. Neutral colours are better than bright ones. Don't feed the animals and stay in the jeep.",
  },
];

function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const FACTS = [
  { icon: Clock, title: "Park hours", body: "6:00am to 6:00pm, every day" },
  { icon: Sun, title: "Best drives", body: "Early morning, or from about 2:30pm" },
  { icon: Ticket, title: "Gate fee", body: "About USD 40–45 per foreign adult, less in groups" },
  { icon: MapPin, title: "From the house", body: "A few minutes' drive to the park entrance" },
];

const ROUTES = [
  { icon: Car, from: "Colombo", time: "3.5–4 h by car", note: "Southern Expressway. About 5 h by direct bus." },
  { icon: Car, from: "Colombo Airport", time: "4.5–5 h by car", note: "We can arrange a driver to meet you." },
  { icon: Car, from: "Ella", time: "2–2.5 h by car", note: "Via Wellawaya. 3–4 h by bus with one change." },
  { icon: Bus, from: "South coast", time: "1.5–3 h", note: "Tangalle is closest; Mirissa and Galle 2–3 h." },
];

export default async function GuidePage() {
  const { contact } = await getSiteContent();
  const wa = `https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Hello! A question about visiting Udawalawe")}`;

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col">
      <BreadcrumbJsonLd trail={[{ name: "Home", path: "/" }, { name: "Local Guide", path: "/guide" }]} />
      <FaqJsonLd />
      <PublicHeader variant="solid" />

      <main className="flex-1">
        <section className="relative py-24 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs sm:text-sm font-mono block">
                Local Guide
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-white leading-tight">
                Udawalawe, the Practical Bits
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                When to go, what the park costs, and how to get here. Prices and times change, so
                treat the numbers as a guide and ask us for today&apos;s.
              </p>
            </ScrollReveal>
          </div>
        </section>

        <section className="py-16 px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FACTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
                <Icon className="w-5 h-5 text-emerald-400" />
                <p className="mt-3 text-xs font-mono uppercase tracking-wider text-stone-500">{title}</p>
                <p className="mt-1 text-sm text-stone-200 leading-snug">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 sm:px-8 lg:px-16 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-16">
          <ScrollReveal direction="right">
            <div className="space-y-5">
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">The Elephants</span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight">Here All Year</h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                Udawalawe is the most dependable park in Sri Lanka for wild elephants, in any
                month. In the dry season the herds come together near the reservoir, and calves
                are a common sight. Morning drives start at the gate at 6:00am; afternoon drives
                catch the herds coming down to drink.
              </p>
              <p className="text-stone-400 text-sm leading-relaxed">
                Next to the park, the Elephant Transit Home raises orphaned calves and returns them
                to the wild. Watching a milk feeding from the platform is a lovely hour, before or
                after a drive.
              </p>
              <Link href="/safari" className="inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
                Safari drives from the house &rarr;
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="left">
            <div className="relative rounded-2xl overflow-hidden border border-stone-800 h-[380px]">
              <Image
                src="/safari-elephant-herd.webp"
                alt="A herd of elephants in Udawalawe National Park"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </ScrollReveal>
        </section>

        <section className="py-16 px-6 sm:px-8 lg:px-16 bg-stone-900/40 border-y border-stone-850">
          <div className="max-w-6xl mx-auto">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">Getting Here</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-white">Between the Hills and the Beach</h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ROUTES.map(({ icon: Icon, from, time, note }) => (
                <div key={from} className="flex gap-4 rounded-2xl border border-stone-800 bg-stone-950/60 p-5">
                  <Icon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">
                      From {from} <span className="text-emerald-400 font-normal">· {time}</span>
                    </p>
                    <p className="mt-1 text-sm text-stone-400">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-3xl mx-auto">
          <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">FAQs</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-white">Questions Guests Ask Us</h2>
          <div className="mt-8 divide-y divide-stone-800 border-y border-stone-800">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left text-stone-100 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="mt-0.5 text-emerald-400 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-stone-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-6 text-center">
            <p className="text-stone-200">Still wondering about something?</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <a href={wa} className="px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium">
                WhatsApp us
              </a>
              <Link href="/book" className="px-5 py-2.5 rounded-full border border-stone-700 hover:bg-stone-800 text-sm font-medium">
                Check availability
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
