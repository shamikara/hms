/** Safari drives a guest can add when booking. Shared by the form, emails and admin. */
export const SAFARI_OPTIONS = [
  { value: "MORNING", label: "Morning safari", time: "about 6:00–10:00am", note: "Best light, most active animals" },
  { value: "AFTERNOON", label: "Afternoon safari", time: "about 2:30–6:00pm", note: "Golden light, elephants at the water" },
  { value: "FULL_DAY", label: "Full-day safari", time: "about 6:00am–6:00pm", note: "Deep into the park, with a packed lunch" },
] as const;

export type SafariChoice = (typeof SAFARI_OPTIONS)[number]["value"];

export function safariLabel(value: string | null | undefined): string | null {
  return SAFARI_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
