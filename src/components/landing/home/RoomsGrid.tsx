import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Users } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { PublicRooms } from "@/features/rooms/services/public-rooms.service";
import { SectionHeading } from "./SectionHeading";

/** Room types from the admin panel, as cards with the rate up front. */
export function RoomsGrid({ rooms }: { rooms: PublicRooms }) {
  const money = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: rooms.currencyCode,
    maximumFractionDigits: 0,
  });

  return (
    <section className="bg-white py-20 sm:py-28 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <ScrollReveal>
            <SectionHeading eyebrow="Rooms" title="Somewhere cool to come back to">
              <p>Air-conditioned, spotless, each with its own bathroom.</p>
            </SectionHeading>
          </ScrollReveal>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600 transition-colors shrink-0"
          >
            All room details <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className={`grid gap-6 lg:gap-8 ${rooms.roomTypes.length >= 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}>
          {rooms.roomTypes.map((room, i) => (
            <ScrollReveal key={room.id} delay={i * 0.08}>
              <article className="group h-full flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-stone-900/10 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)] transition-shadow hover:shadow-[0_24px_60px_-28px_rgba(28,25,23,0.45)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={room.imageUrl}
                    alt={room.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-800 shadow-sm">
                    <Users className="h-3.5 w-3.5 text-emerald-700" aria-hidden /> Sleeps {room.capacity}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-0 p-6 sm:p-7 [&>*:last-child]:mt-6">
                  <h3 className="font-serif text-2xl text-stone-900">{room.name}</h3>
                  {room.description && (
                    <p className="mt-3 text-sm leading-relaxed text-stone-600 line-clamp-3">{room.description}</p>
                  )}
                  {room.features.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {room.features.slice(0, 4).map((f) => (
                        <li key={f} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
                          <Check className="h-3 w-3 text-emerald-700" aria-hidden /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100">
                    <p className="text-sm text-stone-600 whitespace-nowrap">
                      {room.basePrice === null ? (
                        <span className="font-medium text-stone-800">Rates on request</span>
                      ) : (
                        <>
                          <span className="text-xl font-semibold text-stone-900">{money.format(room.basePrice)}</span> / night
                        </>
                      )}
                    </p>
                    <Link
                      href="/book"
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      Check dates <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
