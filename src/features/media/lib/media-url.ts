/**
 * Recognises URLs of photos uploaded to this site's own Supabase bucket.
 * Server-side: reads SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL also accepted).
 */
export const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "media";

/**
 * The project URL, e.g. https://abc.supabase.co, or null when not set.
 *
 * Forgives the usual copy-paste slips: quotes around the value, a missing
 * https://, or the API path (/rest/v1, /storage/v1) left on the end.
 */
export function supabaseUrl(): string | null {
  let raw = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw.replace(/\/(rest|storage|auth)\/v1.*$/i, "").replace(/\/+$/, "");
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
