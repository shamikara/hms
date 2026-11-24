import { MEDIA_BUCKET } from "./media-url";

/**
 * Supabase Storage over plain REST, so there is no SDK to install.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (server only). The
 * bucket ("media" unless NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET says otherwise)
 * must exist and be public, so the website can show the files.
 */

export class StorageError extends Error {}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    throw new StorageError("Photo uploads are not set up yet (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are missing).");
  }
  return { url, key };
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

function headers(key: string): Record<string, string> {
  // New-style secret keys (sb_secret_...) go in the apikey header; the legacy
  // service_role JWT also works as a bearer token.
  const h: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

export async function uploadObject(path: string, body: Buffer, contentType: string): Promise<string> {
  const { url, key } = config();
  const res = await fetch(`${url}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers(key), "Content-Type": contentType, "Cache-Control": "31536000", "x-upsert": "false" },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 404 || /bucket not found/i.test(text)) {
      throw new StorageError(`The "${MEDIA_BUCKET}" storage bucket does not exist in Supabase yet. Create it (public) and try again.`);
    }
    throw new StorageError(`Supabase refused the upload (${res.status}). ${text.slice(0, 200)}`);
  }
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export async function deleteObject(path: string): Promise<void> {
  const { url, key } = config();
  const res = await fetch(`${url}/storage/v1/object/${MEDIA_BUCKET}`, {
    method: "DELETE",
    headers: { ...headers(key), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok && res.status !== 404) {
    throw new StorageError(`Supabase refused to delete the file (${res.status}).`);
  }
}
