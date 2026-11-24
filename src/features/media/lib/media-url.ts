/**
 * Recognises URLs of photos uploaded to this site's own Supabase bucket.
 * Server-side: reads SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL also accepted).
 */
export const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "media";

/** The project URL, e.g. https://abc.supabase.co, or null when not set. */
export function supabaseUrl(): string | null {
  const raw = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function mediaPublicPrefix(): string | null {
  const base = supabaseUrl();
  return base ? `${base}/storage/v1/object/public/${MEDIA_BUCKET}/` : null;
}

/** True for a photo uploaded through Admin > Photos (our bucket, nothing else). */
export function isUploadedMediaUrl(value: unknown): value is string {
  const prefix = mediaPublicPrefix();
  return (
    typeof value === "string" &&
    !!prefix &&
    value.startsWith(prefix) &&
    /^[a-z0-9/_-]+\.webp$/i.test(value.slice(prefix.length)) &&
    !value.includes("..")
  );
}
