"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
  Trees,
} from "lucide-react";
import type { MediaBoardData } from "../actions/media.actions";
import { deleteMedia, saveFoodPhotos, saveGalleryPhotos, saveHeroSlides, updateMediaAlt } from "../actions/media.actions";
import { PhotoPicker, Thumb, uploadPhoto } from "./PhotoPicker";
import { HERO_TRANSITIONS, type HeroTransitionName } from "../lib/builtin";

const card = "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900";
const input =
  "w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/40";
const small =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:border-emerald-600 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:pointer-events-none";
const primary =
  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40";

const TRANSITION_LABEL: Record<HeroTransitionName, string> = {
  fade: "Fade",
  wipe: "Wipe across",
  iris: "Circle reveal",
  split: "Split open",
  push: "Push in",
  zoom: "Zoom in",
};

type Tab = "hero" | "gallery" | "food" | "library";

function RowShell({
  src,
  alt,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  src: string;
  alt: string;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 items-start py-3">
      <span className="w-6 pt-2 text-xs font-mono text-stone-400">{index + 1}</span>
      <Thumb src={src} alt={alt} className="w-28 h-20 rounded-lg shrink-0" />
      <div className="flex-1 grid gap-2 sm:grid-cols-2">{children}</div>
      <div className="flex flex-col gap-1">
        <button className={small} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button className={small} onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down">
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button className={`${small} hover:border-red-500 hover:text-red-600`} onClick={onRemove} aria-label="Remove">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function MediaBoard({ data, loadError }: { data: MediaBoardData | null; loadError?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("hero");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | "hero" | "food" | "gallery">(null);
  const [uploads, setUploads] = useState<{ name: string; state: "pending" | "done" | "error"; message?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const savedHero = useMemo(() => JSON.stringify(data?.content.heroSlides ?? []), [data]);
  const savedFood = useMemo(
    () => JSON.stringify((data?.content.foodPhotos ?? []).map(({ src, alt, caption }) => ({ src, alt, caption }))),
    [data],
  );
  const savedGallery = useMemo(
    () => JSON.stringify((data?.content.galleryPhotos ?? []).map(({ src, alt, wide }) => ({ src, alt, wide }))),
    [data],
  );
  const [gallery, setGallery] = useState(() => (data?.content.galleryPhotos ?? []).map(({ src, alt, wide }) => ({ src, alt, wide })));
  const [hero, setHero] = useState(() => data?.content.heroSlides ?? []);
  const [food, setFood] = useState(() => (data?.content.foodPhotos ?? []).map(({ src, alt, caption }) => ({ src, alt, caption })));
  const [seen, setSeen] = useState({ savedHero, savedFood, savedGallery });
  if (seen.savedHero !== savedHero || seen.savedFood !== savedFood || seen.savedGallery !== savedGallery) {
    setSeen({ savedHero, savedFood, savedGallery });
    setHero(JSON.parse(savedHero));
    setFood(JSON.parse(savedFood));
    setGallery(JSON.parse(savedGallery));
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {loadError ?? "Photos could not be loaded."}
      </div>
    );
  }

  const heroDirty = JSON.stringify(hero) !== savedHero;
  const foodDirty = JSON.stringify(food) !== savedFood;
  const galleryDirty = JSON.stringify(gallery) !== savedGallery;

  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string) => {
    setError(null);
    startTransition(async () => {
      const r = await action();
      if (r.success) {
        setToast(message);
        router.refresh();
      } else setError(r.error ?? "That did not work.");
    });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 20);
    setUploads(list.map((f) => ({ name: f.name, state: "pending" })));
    setError(null);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      try {
        await uploadPhoto(f);
        ok++;
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, state: "done" } : x)));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, state: "error", message } : x)));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    if (ok) {
      setToast(`${ok} photo${ok === 1 ? "" : "s"} uploaded. Add a short description to each in the Library tab.`);
      setTab("library");
      router.refresh();
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; dirty?: boolean }[] = [
    { id: "hero", label: "Homepage slideshow", icon: Images, dirty: heroDirty },
    { id: "gallery", label: "Around the house", icon: Trees, dirty: galleryDirty },
    { id: "food", label: "Food page", icon: UtensilsCrossed, dirty: foodDirty },
    { id: "library", label: `Library (${data.library.length})`, icon: ImagePlus },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Images className="w-6 h-6 text-emerald-600" /> Photos
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-2xl">
            Upload photos, then choose what the homepage slideshow, the &ldquo;Around the house&rdquo; strip and the Food page
            show. Room, driver and dish photos are chosen on their own pages (Room Inventory, Fleet, Menu) with the same picker. Please only use photos of the real property, and no guests&apos; faces without their consent.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
          <button className={primary} disabled={!data.storageReady || uploads.some((u) => u.state === "pending")} onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Upload photos
          </button>
        </div>
      </div>

      {!data.storageReady && (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Uploading is not switched on yet: add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel and create a
            public &ldquo;media&rdquo; bucket in Supabase Storage. You can still rearrange the built-in photos below.
          </span>
        </div>
      )}

      {uploads.length > 0 && (
        <ul className={`${card} p-3 text-sm space-y-1`}>
          {uploads.map((u, i) => (
            <li key={i} className="flex items-center gap-2">
              {u.state === "pending" && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
              {u.state === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {u.state === "error" && <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span className="truncate">{u.name}</span>
              {u.message && <span className="text-red-600 text-xs">{u.message}</span>}
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px ${
              tab === t.id ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {t.dirty && <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />}
          </button>
        ))}
      </div>

      {tab === "hero" && (
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              The big photos at the top of the homepage, in this order. Each arrives with its own transition. Wide
              (landscape) photos work best.
            </p>
            <div className="flex gap-2">
              <button className={small} disabled={hero.length >= 10} onClick={() => setPicker("hero")}>
                <Plus className="w-3.5 h-3.5" /> Add photo
              </button>
              <button className={primary} disabled={!heroDirty || isPending || hero.length === 0} onClick={() => run(() => saveHeroSlides(hero), "Slideshow saved. The homepage shows it now.")}>
                <Save className="w-4 h-4" /> {heroDirty ? "Save slideshow" : "Saved"}
              </button>
            </div>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-stone-800 mt-3">
            {hero.map((s, i) => (
              <RowShell
                key={`${s.src}-${i}`}
                src={s.src}
                alt={s.alt}
                index={i}
                count={hero.length}
                onMove={(d) => setHero(move(hero, i, d))}
                onRemove={() => setHero(hero.filter((_, j) => j !== i))}
              >
                <label className="text-xs text-stone-500">
                  Description (for screen readers)
                  <input className={input} value={s.alt} maxLength={200} onChange={(e) => setHero(hero.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                </label>
                <label className="text-xs text-stone-500">
                  Transition
                  <select
                    className={input}
                    value={s.transition}
                    onChange={(e) => setHero(hero.map((x, j) => (j === i ? { ...x, transition: e.target.value as HeroTransitionName } : x)))}
                  >
                    {HERO_TRANSITIONS.map((t) => (
                      <option key={t} value={t}>
                        {TRANSITION_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </RowShell>
            ))}
          </ul>
        </section>
      )}

      {tab === "gallery" && (
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              The endless strip of photos on the homepage (&ldquo;Around the house&rdquo;). Tick &ldquo;Wide&rdquo; for landscape
              photos so they get a wider card.
            </p>
            <div className="flex gap-2">
              <button className={small} disabled={gallery.length >= 20} onClick={() => setPicker("gallery")}>
                <Plus className="w-3.5 h-3.5" /> Add photo
              </button>
              <button
                className={primary}
                disabled={!galleryDirty || isPending || gallery.length < 3}
                onClick={() => run(() => saveGalleryPhotos(gallery), "Photo strip saved. The homepage shows it now.")}
              >
                <Save className="w-4 h-4" /> {galleryDirty ? "Save photo strip" : "Saved"}
              </button>
            </div>
          </div>
          {gallery.length < 3 && <p className="mt-3 text-sm text-amber-700">Add at least 3 photos so the strip can loop.</p>}
          <ul className="divide-y divide-stone-100 dark:divide-stone-800 mt-3">
            {gallery.map((s, i) => (
              <RowShell
                key={`${s.src}-${i}`}
                src={s.src}
                alt={s.alt}
                index={i}
                count={gallery.length}
                onMove={(d) => setGallery(move(gallery, i, d))}
                onRemove={() => setGallery(gallery.filter((_, j) => j !== i))}
              >
                <label className="text-xs text-stone-500">
                  Description (for screen readers)
                  <input className={input} value={s.alt} maxLength={200} onChange={(e) => setGallery(gallery.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 sm:pt-5">
                  <input type="checkbox" className="accent-emerald-700" checked={s.wide} onChange={(e) => setGallery(gallery.map((x, j) => (j === i ? { ...x, wide: e.target.checked } : x)))} />
                  Wide card
                </label>
              </RowShell>
            ))}
          </ul>
        </section>
      )}

      {tab === "food" && (
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">The &ldquo;From Our Kitchen&rdquo; photo wall on the Food page. Captions show on each photo.</p>
            <div className="flex gap-2">
              <button className={small} disabled={food.length >= 16} onClick={() => setPicker("food")}>
                <Plus className="w-3.5 h-3.5" /> Add photo
              </button>
              <button className={primary} disabled={!foodDirty || isPending} onClick={() => run(() => saveFoodPhotos(food), "Food photos saved. The Food page shows them now.")}>
                <Save className="w-4 h-4" /> {foodDirty ? "Save food photos" : "Saved"}
              </button>
            </div>
          </div>
          {food.length === 0 && <p className="mt-4 text-sm text-stone-500">No photos: the photo wall is hidden on the Food page.</p>}
          <ul className="divide-y divide-stone-100 dark:divide-stone-800 mt-3">
            {food.map((s, i) => (
              <RowShell
                key={`${s.src}-${i}`}
                src={s.src}
                alt={s.alt}
                index={i}
                count={food.length}
                onMove={(d) => setFood(move(food, i, d))}
                onRemove={() => setFood(food.filter((_, j) => j !== i))}
              >
                <label className="text-xs text-stone-500">
                  Caption (shown on the photo)
                  <input className={input} value={s.caption} maxLength={80} placeholder="e.g. String hoppers with curries" onChange={(e) => setFood(food.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                </label>
                <label className="text-xs text-stone-500">
                  Description (for screen readers)
                  <input className={input} value={s.alt} maxLength={200} onChange={(e) => setFood(food.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                </label>
              </RowShell>
            ))}
          </ul>
        </section>
      )}

      {tab === "library" && (
        <section className={`${card} p-5`}>
          {data.library.length === 0 ? (
            <p className="text-sm text-stone-500">No uploads yet. Use &ldquo;Upload photos&rdquo; above; the site&apos;s built-in photos are always available too.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.library.map((m) => (
                <LibraryCard key={m.id} item={m} busy={isPending} onDelete={() => run(() => deleteMedia(m.id), "Photo deleted.")} onAlt={(alt) => run(() => updateMediaAlt({ id: m.id, alt }), "Description saved.")} />
              ))}
            </div>
          )}
        </section>
      )}

      {picker && (
        <PhotoPicker
          choices={data.choices}
          onClose={() => setPicker(null)}
          onPick={(c) => {
            if (picker === "hero") setHero([...hero, { src: c.src, alt: c.alt, transition: HERO_TRANSITIONS[hero.length % HERO_TRANSITIONS.length] }]);
            else if (picker === "gallery") setGallery([...gallery, { src: c.src, alt: c.alt, wide: c.width > c.height * 1.2 }]);
            else setFood([...food, { src: c.src, alt: c.alt, caption: "" }]);
            setPicker(null);
            if (c.uploaded && !data.choices.some((x) => x.src === c.src)) router.refresh();
          }}
        />
      )}
    </div>
  );
}

function LibraryCard({
  item,
  busy,
  onDelete,
  onAlt,
}: {
  item: MediaBoardData["library"][number];
  busy: boolean;
  onDelete: () => void;
  onAlt: (alt: string) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
      <Thumb src={item.src} alt={item.alt} className="w-full h-44" />
      <div className="p-3 space-y-2">
        <div className="text-[11px] text-stone-500">
          {item.width}×{item.height} · {Math.round(item.bytes / 1024)} KB
        </div>
        <div className="flex gap-2">
          <input className={input} value={alt} maxLength={200} placeholder="Describe the photo" onChange={(e) => setAlt(e.target.value)} />
          <button className={small} disabled={busy || alt === item.alt} onClick={() => onAlt(alt)}>
            <Save className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {item.usedIn.length ? (
            item.usedIn.map((u) => (
              <span key={u} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {u}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-stone-400">Not used yet</span>
          )}
          <span className="flex-1" />
          {confirm ? (
            <span className="flex items-center gap-1 text-xs">
              Delete?
              <button className="px-2 py-0.5 rounded bg-red-600 text-white" onClick={onDelete}>
                Yes
              </button>
              <button className="px-2 py-0.5 rounded border border-stone-300" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30" disabled={item.usedIn.length > 0} title={item.usedIn.length ? "In use, so it cannot be deleted" : "Delete"} onClick={() => setConfirm(true)}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
