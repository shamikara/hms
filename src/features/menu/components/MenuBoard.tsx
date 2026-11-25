"use client";

import { showToast } from "@/components/ui/toast";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { PhotoField, Thumb } from "@/features/media/components/PhotoPicker";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  Leaf,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { MealPeriod } from "@prisma/client";
import type { MenuBoardData } from "@/features/menu/actions/menu.actions";
import { archiveDish, createDish, saveDayMenu, updateDish } from "@/features/menu/actions/menu.actions";
import type { DishRow } from "@/features/menu/services/menu.service";
import { MEALS } from "@/features/menu/validations/menu.schema";

const small =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:border-emerald-600 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:pointer-events-none";
const field =
  "rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/40";
const input = `w-full ${field}`;

function shift(day: string, by: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

function longDate(day: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

type Draft = { name: string; description: string; price: string; vegetarian: boolean; spicy: boolean; meal: MealPeriod; imageUrl: string };
const emptyDraft = (meal: MealPeriod): Draft => ({ name: "", description: "", price: "", vegetarian: false, spicy: false, meal, imageUrl: "" });
const toDraft = (d: DishRow): Draft => ({
  name: d.name,
  description: d.description ?? "",
  price: d.price === null ? "" : String(d.price),
  vegetarian: d.vegetarian,
  spicy: d.spicy,
  meal: d.meal,
  imageUrl: d.imageUrl ?? "",
});

function DishForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  busy,
  submitLabel,
  currency,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  submitLabel: string;
  currency: string;
}) {
  return (
    <form
      className="space-y-2 rounded-xl border border-emerald-600/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input className={input} placeholder="Dish name, e.g. String hoppers" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} autoFocus />
      <input
        className={input}
        placeholder="Short description (optional)"
        value={draft.description}
        onChange={(e) => onChange({ ...draft, description: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <select className={field} value={draft.meal} onChange={(e) => onChange({ ...draft, meal: e.target.value as MealPeriod })} aria-label="Meal">
          {MEALS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-stone-500">
          Price ({currency})
          <input
            className={`${field} w-28`}
            inputMode="decimal"
            placeholder="blank = none"
            value={draft.price}
            onChange={(e) => onChange({ ...draft, price: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
          <input type="checkbox" checked={draft.vegetarian} onChange={(e) => onChange({ ...draft, vegetarian: e.target.checked })} />
          Vegetarian
        </label>
        <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
          <input type="checkbox" checked={draft.spicy} onChange={(e) => onChange({ ...draft, spicy: e.target.checked })} />
          Spicy
        </label>
      </div>
      <PhotoField value={draft.imageUrl} onChange={(src) => onChange({ ...draft, imageUrl: src })} emptyLabel="Optional: shows on the Food page" />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={small}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function MenuBoard({ data, loadError }: { data: MenuBoardData | null; loadError?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Keyed on the saved menu's content, not the data object: editing or adding
  // a dish refreshes the page data but must not wipe unsaved ticks.
  const savedKey = data
    ? `${data.day.date}|${data.day.items.map((i) => `${i.dishId}:${i.soldOut ? 1 : 0}`).sort().join(",")}`
    : "";
  const initial = useMemo(
    () => new Map(savedKey.split("|")[1]?.split(",").filter(Boolean).map((p) => [p.split(":")[0], p.split(":")[1] === "1"] as const) ?? []),
    [savedKey],
  );
  const [picked, setPicked] = useState<Map<string, boolean>>(initial);
  // Reset the ticks when the saved menu changes (another day, or just saved).
  const [seenKey, setSeenKey] = useState(savedKey);
  if (seenKey !== savedKey) {
    setSeenKey(savedKey);
    setPicked(new Map(initial));
  }

  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const dirty = useMemo(() => {
    if (picked.size !== initial.size) return true;
    for (const [id, soldOut] of picked) if (initial.get(id) !== soldOut) return true;
    return false;
  }, [picked, initial]);

  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {loadError ?? "The menu could not be loaded."}
      </div>
    );
  }

  const { dishes, day, previous, today, currency } = data;
  const isToday = day.date === today;
  const isPast = day.date < today;
  const go = async (d: string) => {
    if (
      dirty &&
      !(await confirmAction({
        title: "Leave without saving?",
        message: "You ticked or unticked dishes for this day but haven't saved. Those changes will be lost.",
        confirmLabel: "Leave without saving",
        cancelLabel: "Stay",
        tone: "warning",
      }))
    )
      return;
    router.push(d === today ? "/admin/menu" : `/admin/menu?date=${d}`);
  };

  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        showToast(message);
        after?.();
        router.refresh();
      } else setError(result.error ?? "That did not work.");
    });
  };

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, false);
      return next;
    });
  const toggleSoldOut = (id: string) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.set(id, !next.get(id));
      return next;
    });

  const save = () =>
    run(
      () => saveDayMenu({ date: day.date, items: [...picked].map(([dishId, soldOut]) => ({ dishId, soldOut })) }),
      picked.size ? `Menu saved — ${picked.size} dish${picked.size === 1 ? "" : "es"} on ${isToday ? "today" : longDate(day.date)}.` : "Menu cleared for that day.",
    );

  const payload = (d: Draft) => ({ ...d, price: d.price.trim() });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-emerald-600" /> Today&apos;s Menu
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-2xl">
            Tick what the kitchen is cooking and save. It appears on the Food page of the website straight away, for that
            day only. Mark a dish sold out to keep it listed but greyed out.
          </p>
        </div>
        <a href="/dining#todays-menu" target="_blank" rel="noreferrer" className={small}>
          <ExternalLink className="w-3.5 h-3.5" /> View Food page
        </a>
      </div>

      {/* Day picker and actions */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur p-3">
        <button className={small} onClick={() => go(shift(day.date, -1))} aria-label="Previous day">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="px-2 min-w-[12rem]">
          <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{longDate(day.date)}</div>
          <div className="text-[11px] uppercase tracking-wider text-stone-500">
            {isToday ? "Today — live on the website" : isPast ? "Past day" : "Upcoming — goes live on the day"}
          </div>
        </div>
        <button className={small} onClick={() => go(shift(day.date, 1))} aria-label="Next day">
          <ChevronRight className="w-4 h-4" />
        </button>
        <input
          type="date"
          className={`${field} py-1.5`}
          value={day.date}
          onChange={(e) => e.target.value && go(e.target.value)}
          aria-label="Pick a day"
        />
        {!isToday && (
          <button className={small} onClick={() => go(today)}>
            Today
          </button>
        )}
        <div className="flex-1" />
        <button
          className={small}
          disabled={previous.items.length === 0}
          title={previous.items.length ? "Start from the previous day's menu" : "Nothing was on the previous day"}
          onClick={() => setPicked(new Map(previous.items.map((i) => [i.dishId, false])))}
        >
          <Copy className="w-3.5 h-3.5" /> Copy previous day ({previous.items.length})
        </button>
        <button className={small} disabled={picked.size === 0} onClick={() => setPicked(new Map())}>
          <X className="w-3.5 h-3.5" /> Clear
        </button>
        <button
          onClick={save}
          disabled={isPending || !dirty}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
        >
          <Save className="w-4 h-4" /> {dirty ? "Save menu" : "Saved"}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {MEALS.map((meal) => {
          const list = dishes.filter((d) => d.meal === meal.value);
          const on = list.filter((d) => picked.has(d.id)).length;
          return (
            <section key={meal.value} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-3">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg text-stone-900 dark:text-stone-50">{meal.label}</h2>
                  <p className="text-[11px] uppercase tracking-wider text-stone-500">{meal.hint}</p>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {on} on the menu
                </span>
              </header>

              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {list.length === 0 && <li className="py-3 text-sm text-stone-500">No dishes yet. Add the first one below.</li>}
                {list.map((dish) => {
                  const checked = picked.has(dish.id);
                  const soldOut = picked.get(dish.id) === true;
                  if (editing?.id === dish.id) {
                    return (
                      <li key={dish.id} className="py-2">
                        <DishForm
                          draft={editing.draft}
                          onChange={(draft) => setEditing({ id: dish.id, draft })}
                          onCancel={() => setEditing(null)}
                          onSubmit={() => run(() => updateDish(dish.id, payload(editing.draft)), "Dish updated.", () => setEditing(null))}
                          busy={isPending}
                          submitLabel="Save dish"
                          currency={currency}
                        />
                      </li>
                    );
                  }
                  return (
                    <li key={dish.id} className="py-2.5 flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-emerald-700"
                        checked={checked}
                        onChange={() => toggle(dish.id)}
                        aria-label={`${dish.name} on the menu`}
                      />
                      {dish.imageUrl && <Thumb src={dish.imageUrl} alt="" className="h-10 w-10 rounded-md shrink-0" />}
                      <button type="button" onClick={() => toggle(dish.id)} className="flex-1 text-left">
                        <span className={`text-sm font-medium ${checked ? "text-stone-900 dark:text-stone-50" : "text-stone-500"} ${soldOut ? "line-through" : ""}`}>
                          {dish.name}
                        </span>
                        {dish.vegetarian && <Leaf className="inline w-3.5 h-3.5 ml-1.5 text-emerald-600" aria-label="Vegetarian" />}
                        {dish.spicy && <Flame className="inline w-3.5 h-3.5 ml-1 text-orange-500" aria-label="Spicy" />}
                        {dish.price !== null && (
                          <span className="ml-2 text-xs font-mono text-stone-500">
                            {currency} {dish.price.toLocaleString("en-GB")}
                          </span>
                        )}
                        {dish.description && <span className="block text-xs text-stone-500 mt-0.5">{dish.description}</span>}
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {checked && (
                          <button
                            type="button"
                            onClick={() => toggleSoldOut(dish.id)}
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${
                              soldOut ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" : "border-stone-200 dark:border-stone-700 text-stone-500 hover:border-amber-500"
                            }`}
                          >
                            {soldOut ? "Sold out" : "Mark sold out"}
                          </button>
                        )}
                        <button type="button" className="p-1.5 text-stone-400 hover:text-emerald-600" aria-label={`Edit ${dish.name}`} onClick={() => setEditing({ id: dish.id, draft: toDraft(dish) })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmArchive === dish.id ? (
                          <span className="flex items-center gap-1 text-[11px]">
                            Remove?
                            <button
                              className="px-2 py-0.5 rounded bg-red-600 text-white"
                              onClick={() =>
                                run(() => archiveDish(dish.id), `${dish.name} removed from the dish list.`, () => {
                                  setConfirmArchive(null);
                                  setPicked((p) => {
                                    const n = new Map(p);
                                    n.delete(dish.id);
                                    return n;
                                  });
                                })
                              }
                            >
                              Yes
                            </button>
                            <button className="px-2 py-0.5 rounded border border-stone-300" onClick={() => setConfirmArchive(null)}>
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button type="button" className="p-1.5 text-stone-400 hover:text-red-600" aria-label={`Remove ${dish.name}`} onClick={() => setConfirmArchive(dish.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {adding?.meal === meal.value ? (
                <DishForm
                  draft={adding}
                  onChange={setAdding}
                  onCancel={() => setAdding(null)}
                  onSubmit={() =>
                    run(
                      async () => {
                        const r = await createDish(payload(adding));
                        // A new dish is usually being added because it is on today.
                        if (r.success && r.data) {
                          const id = r.data.id;
                          setPicked((p) => new Map(p).set(id, false));
                        }
                        return r;
                      },
                      `${adding.name.trim()} added and ticked — remember to save the menu.`,
                      () => setAdding(null),
                    )
                  }
                  busy={isPending}
                  submitLabel="Add dish"
                  currency={currency}
                />
              ) : (
                <button className={small} onClick={() => setAdding(emptyDraft(meal.value))}>
                  <Plus className="w-3.5 h-3.5" /> Add a {meal.label.toLowerCase()} dish
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
