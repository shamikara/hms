import Image from "next/image";
import Link from "next/link";
import { Flame, Leaf, UtensilsCrossed } from "lucide-react";
import type { PublicMenu } from "@/features/menu/services/menu.service";
import { MEALS } from "@/features/menu/validations/menu.schema";

function longDate(day: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

/** The "what's cooking today" board on the Food page. */
export function TodaysMenu({
  menu,
  whatsapp,
}: {
  menu: PublicMenu | null;
  whatsapp?: string | null;
}) {
  return (
    <section
      id="todays-menu"
      className="py-20 px-6 sm:px-12 lg:px-24 border-b border-stone-850 bg-stone-950 scroll-mt-24"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 block">
            From the Kitchen
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-white">
            Today&apos;s Menu
          </h2>
          {menu ? (
            <p className="text-stone-400 text-sm">
              {longDate(menu.date)} &middot; what the kitchen is cooking today
            </p>
          ) : null}
        </div>

        {menu ? (
          <div
            className={`grid grid-cols-1 gap-6 ${menu.meals.length > 1 ? "md:grid-cols-2" : "max-w-xl mx-auto"}`}
          >
            {menu.meals.map(({ meal, dishes }) => {
              const info = MEALS.find((m) => m.value === meal);
              return (
                <div
                  key={meal}
                  className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6 sm:p-8"
                >
                  <div className="flex items-baseline justify-between border-b border-dashed border-stone-700 pb-3 mb-4">
                    <h3 className="font-serif text-xl text-white">
                      {info?.label ?? meal}
                    </h3>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                      {info?.hint}
                    </span>
                  </div>
                  <ul className="space-y-4">
                    {dishes.map((d) => (
                      <li
                        key={d.name}
                        className={`flex gap-4 ${d.soldOut ? "opacity-50" : ""}`}
                      >
                        {d.imageUrl && (
                          <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-stone-800">
                            <Image
                              src={d.imageUrl}
                              alt={d.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-stone-100 font-medium ${d.soldOut ? "line-through" : ""}`}
                            >
                              {d.name}
                            </span>
                            {d.vegetarian && (
                              <Leaf
                                className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                                aria-label="Vegetarian"
                              />
                            )}
                            {d.spicy && (
                              <Flame
                                className="w-3.5 h-3.5 text-orange-400 shrink-0"
                                aria-label="Spicy"
                              />
                            )}
                            <span
                              className="flex-1 border-b border-dotted border-stone-700 translate-y-[-3px]"
                              aria-hidden
                            />
                            {d.soldOut ? (
                              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                                Sold out
                              </span>
                            ) : d.price !== null ? (
                              <span className="text-sm font-mono text-stone-300">
                                {menu.currency}{" "}
                                {d.price.toLocaleString("en-GB")}
                              </span>
                            ) : null}
                          </div>
                          {d.description && (
                            <p className="text-sm text-stone-400 mt-1 leading-relaxed">
                              {d.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center rounded-2xl border border-stone-800 bg-stone-900/70 p-8 space-y-3">
            <UtensilsCrossed className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-stone-300">
              Today&apos;s menu hasn&apos;t been posted yet.
            </p>
            <p className="text-stone-500 text-sm">
              Ask the team what&apos;s cooking — they&apos;re happy to work
              around what you like.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-stone-500 mt-8">
          Dishes change with the market and the season.{" "}
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              className="text-emerald-400 hover:underline"
            >
              WhatsApp the kitchen
            </a>
          ) : (
            <Link href="/contact" className="text-emerald-400 hover:underline">
              Ask the kitchen
            </Link>
          )}{" "}
          about allergies or anything not listed.
        </p>
      </div>
    </section>
  );
}
