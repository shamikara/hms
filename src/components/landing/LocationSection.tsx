import { Car, Mail, MapPin, Phone } from "lucide-react";
import { ScrollReveal } from "../ui/ScrollReveal";
import { SITE } from "@/lib/seo/site";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { SectionHeading } from "./home/SectionHeading";

export function LocationSection({ contact }: { contact: ContactValues }) {
  const rows = [
    { icon: MapPin, text: `${contact.street}, ${contact.locality} ${contact.postalCode}, Sri Lanka` },
    { icon: Phone, text: contact.phoneDisplay, href: `tel:${contact.phone}` },
    { icon: Mail, text: contact.email, href: `mailto:${contact.email}` },
  ];

  return (
    <section className="bg-white py-20 sm:py-28 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        <ScrollReveal className="lg:col-span-5">
          <SectionHeading eyebrow="Location" title="Find us in Udawalawe">
            <p>
              A short drive from the national park entrance, so a morning drive means an early start
              rather than a long one.
            </p>
          </SectionHeading>

          <ul className="mt-8 space-y-4">
            {rows.map((row) => (
              <li key={row.text} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <row.icon className="h-4 w-4" aria-hidden />
                </span>
                {row.href ? (
                  <a href={row.href} className="pt-1.5 text-stone-800 hover:text-emerald-700 transition-colors">
                    {row.text}
                  </a>
                ) : (
                  <span className="pt-1.5 text-stone-800">{row.text}</span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl bg-[#f6f1e8] p-6">
            <p className="flex items-center gap-2 font-semibold text-stone-900">
              <Car className="h-4 w-4 text-emerald-700" aria-hidden /> Getting here
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Roughly four to five hours by road from Bandaranaike International Airport (CMB),
              depending on traffic. Ask us and we will tell you the best route, or help you find a
              driver.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="lg:col-span-7 min-h-[380px] lg:min-h-[520px]">
          <div className="relative h-full min-h-[380px] lg:min-h-[520px] overflow-hidden rounded-3xl ring-1 ring-stone-900/10">
            <iframe
              title="Map showing the location of Lily Safari Resort"
              src={`https://maps.google.com/maps?q=${SITE.geo.latitude},${SITE.geo.longitude}&z=14&output=embed`}
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
