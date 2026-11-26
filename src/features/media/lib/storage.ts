import { MEDIA_BUCKET, supabaseUrl } from "./media-url";

/**
 * Supabase Storage over plain REST, so there is no SDK to install.
 *
 * Needs SUPABASE_URL and SUPABASE_SECRET_KEY (server only). The
 * bucket ("media" unless NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET says otherwise)
 * must exist and be public, so the website can show the files.
 */

export class StorageError extends Error {}

function config() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SECRET_KEY?.trim().replace(/^["']|["']$/g, "").trim();
  if (!url || !key) {
    throw new StorageError("Photo uploads are not set up yet (SUPABASE_URL and SUPABASE_SECRET_KEY are missing).");
  }
  try {
    new URL(url);
  } catch {
    throw new StorageError("SUPABASE_URL in Vercel is not a web address. It should look like https://abcdefgh.supabase.co");
  }
  // Header values must be plain printable ASCII; a stray line break or a
  // smart quote from copy-paste makes every request fail before it is sent.
  if (!/^[\x21-\x7e]+$/.test(key)) {
    throw new StorageError("SUPABASE_SECRET_KEY in Vercel contains a space, line break or odd character. Copy it again from Supabase and paste it on its own.");
  }
  return { url, key };
}

/** fetch() itself failed (no answer at all): say which way, without secrets. */
function networkError(error: unknown, url: string): StorageError {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();
  const name = error instanceof Error ? error.name : "";
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new StorageError("Supabase took too long to answer. Please try again in a minute.");
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(cause)) {
    return new StorageError(`Could not find the Supabase server "${host}". Check SUPABASE_URL in Vercel (Supabase > Project Settings > API > Project URL).`);
  }
  return new StorageError(`Could not reach Supabase at ${host}${cause ? ` (${cause.slice(0, 120)})` : ""}. Please try again.`);
}

export function isStorageConfigured(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SECRET_KEY?.trim());
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
  let res: Response;
  try {
    res = await fetch(`${url}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
      method: "POST",
      headers: { ...headers(key), "Content-Type": contentType, "Cache-Control": "31536000", "x-upsert": "false" },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw networkError(error, url);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 404 || /bucket not found/i.test(text)) {
      throw new StorageError(`The "${MEDIA_BUCKET}" storage bucket does not exist in Supabase yet. Create it (public) and try again.`);
    }
    if (res.status === 401 || res.status === 403 || /invalid (api key|jwt|signature)|unauthorized/i.test(text)) {
      throw new StorageError("Supabase did not accept the key. Set SUPABASE_SECRET_KEY in Vercel to the project's secret (service role) key, not the publishable/anon key, then redeploy.");
    }
    if (res.status === 413 || /maximum allowed size|payload too large/i.test(text)) {
      throw new StorageError("Supabase refused the file as too large. Check the bucket's file size limit is 500 KB or more.");
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
