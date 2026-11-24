import type { ReactNode } from "react";

/**
 * The eyebrow + title + intro trio every homepage section opens with, so the
 * sections share one rhythm. `tone` follows the section's background.
 */
export function SectionHeading({
  eyebrow,
  title,
  children,
  tone = "dark",
  align = "left",
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  const dark = tone === "dark";
  return (
    <div className={`max-w-2xl space-y-4 ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p
        className={`text-xs font-semibold uppercase tracking-[0.22em] ${
          dark ? "text-emerald-300" : "text-emerald-700"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`font-serif text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.1] tracking-tight ${
          dark ? "text-white" : "text-stone-900"
        }`}
      >
        {title}
      </h2>
      {children && (
        <div className={`text-base sm:text-lg leading-relaxed ${dark ? "text-stone-300" : "text-stone-600"}`}>
          {children}
        </div>
      )}
    </div>
  );
}
