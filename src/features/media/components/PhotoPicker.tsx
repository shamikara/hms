"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ImagePlus, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { listPhotoChoices } from "../actions/media.actions";
import type { PhotoChoice } from "../services/media.service";

/** Shrinks a photo in the browser before upload: phone photos are 3–10 MB. */
export async function shrinkForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    // The browser cannot decode it (HEIC on Windows, say): send it as it is.
    return file;
  }
}

/** Uploads one photo to the media library and returns it as a picker choice. */
export async function uploadPhoto(file: File, alt = ""): Promise<PhotoChoice> {
  const body = new FormData();
  body.append("file", await shrinkForUpload(file), file.name.replace(/\.[^.]+$/, "") + ".jpg");
  body.append("alt", alt);
  const res = await fetch("/api/admin/media", { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? "Your sign-in cannot upload photos. Ask a manager, or pick one already in the library."
        : (json.error ?? `Upload failed (${res.status}).`),
    );
  }
  return { id: json.id, src: json.src, width: json.width, height: json.height, alt: json.alt ?? alt, uploaded: true };
}

export function Thumb({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails; next/image adds nothing here
  return <img src={src} alt={alt} loading="lazy" className={`object-cover bg-stone-100 dark:bg-stone-800 ${className}`} />;
}

/**
 * "Choose a photo" dialog: every photo in the library plus the built-in ones,
 * with an Upload button so a new photo can be added and picked in one go.
 * Pass `choices` when the caller already has them; otherwise they are loaded.
 */
export function PhotoPicker({
  choices: given,
  onPick,
  onClose,
  title = "Choose a photo",
}: {
  choices?: PhotoChoice[];
  onPick: (c: PhotoChoice) => void;
  onClose: () => void;
  title?: string;
}) {
  const [choices, setChoices] = useState<PhotoChoice[] | null>(given ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (given) return;
    let cancelled = false;
    listPhotoChoices().then((r) => {
      if (cancelled) return;
      if (r.success && r.data) setChoices(r.data);
      else setError(r.error ?? "Photos could not be loaded.");
    });
    return () => {
      cancelled = true;
    };
  }, [given]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onPick(await uploadPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // A Radix dialog, so it also works when opened from inside another dialog
  // (the driver form, say): focus, Escape and stacking are handled for us.
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between gap-3 pl-5 pr-12 py-3 border-b border-stone-200 dark:border-stone-800">
          <DialogTitle className="font-serif text-lg font-normal text-stone-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="sr-only">Pick a photo from the library, or upload a new one.</DialogDescription>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload new"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </p>
        )}
        <div className="overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {choices === null && !error && (
            <p className="col-span-full flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading photos…
            </p>
          )}
          {choices?.map((c) => (
            <button
              type="button"
              key={c.src}
              onClick={() => onPick(c)}
              className="group text-left rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:ring-2 hover:ring-emerald-600"
            >
              <Thumb src={c.src} alt={c.alt} className="w-full h-28" />
              <div className="px-2 py-1.5 text-[11px] text-stone-500 truncate">
                {c.uploaded ? "Uploaded" : "Built-in"} · {c.alt || "No description"}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A form field: shows the chosen photo with Change / Remove buttons. */
export function PhotoField({
  value,
  onChange,
  emptyLabel = "No photo yet",
  shape = "wide",
}: {
  value: string;
  onChange: (src: string) => void;
  emptyLabel?: string;
  shape?: "wide" | "round";
}) {
  const [open, setOpen] = useState(false);
  const box = shape === "round" ? "h-20 w-20 rounded-full" : "h-20 w-32 rounded-lg";
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <Thumb src={value} alt="" className={`${box} shrink-0 border border-stone-200 dark:border-stone-800`} />
      ) : (
        <span className={`${box} shrink-0 flex items-center justify-center border border-dashed border-stone-300 dark:border-stone-700 text-stone-400`}>
          <ImagePlus className="w-5 h-5" />
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-emerald-600 hover:text-emerald-600"
        >
          <ImagePlus className="w-3.5 h-3.5" /> {value ? "Change photo" : "Choose or upload"}
        </button>
        {value ? (
          <button type="button" onClick={() => onChange("")} className="text-left text-xs text-stone-500 hover:text-red-600">
            Remove photo
          </button>
        ) : (
          <span className="text-xs text-stone-400">{emptyLabel}</span>
        )}
      </div>
      {open && (
        <PhotoPicker
          onClose={() => setOpen(false)}
          onPick={(c) => {
            onChange(c.src);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
