/**
 * Recognises URLs of photos uploaded to this site's own Supabase bucket.
 * Safe to use in the browser (it only reads NEXT_PUBLIC_ values).
 */
export const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "media";

export function mediaPublicPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
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
