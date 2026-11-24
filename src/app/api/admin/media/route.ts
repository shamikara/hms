import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import prisma from "@/core/db/prisma";
import { requireAdminPermission, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { StorageError, uploadObject, deleteObject } from "@/features/media/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The browser shrinks photos before sending; this is a backstop. */
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 2000;

/**
 * Upload one photo to the media library.
 *
 * Whatever arrives is decoded and re-encoded as WebP: that strips GPS and
 * other camera metadata, fixes rotation, and means only a real image can ever
 * reach the bucket (a renamed script would fail to decode).
 */
export async function POST(request: Request) {
  const guard = await requireAdminPermission("media:manage");
  if (!guard.ok) return NextResponse.json({ error: guard.failure.error }, { status: 403 });

  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return NextResponse.json({ error: "No property is set up." }, { status: 400 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That upload could not be read." }, { status: 400 });
  }
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "").trim().slice(0, 200);
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That photo is too large (4 MB max)." }, { status: 413 });
  if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP or HEIC photos can be uploaded." }, { status: 415 });
  }

  let output: { data: Buffer; info: sharp.OutputInfo };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return NextResponse.json({ error: "That file is not a photo we can read." }, { status: 415 });
  }

  const now = new Date();
  const name = `${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}.webp`;
  const path = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${name}`;

  let url: string;
  try {
    url = await uploadObject(path, output.data, "image/webp");
  } catch (error) {
    const message = error instanceof StorageError ? error.message : "The photo could not be stored. Please try again.";
    console.error("media upload failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        propertyId,
        path,
        url,
        width: output.info.width,
        height: output.info.height,
        bytes: output.info.size,
        alt,
        createdById: guard.actor.userId,
      },
    });
    revalidatePath("/admin/media");
    return NextResponse.json({ id: asset.id, src: url, width: asset.width, height: asset.height, alt: asset.alt });
  } catch (error) {
    // Do not leave an orphaned file behind.
    await deleteObject(path).catch(() => undefined);
    console.error("media record failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The photo could not be saved. Please try again." }, { status: 500 });
  }
}
