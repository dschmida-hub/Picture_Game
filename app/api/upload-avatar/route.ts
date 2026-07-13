import crypto from "crypto";
import sharp from "sharp";

// Image decode/re-encode plus a storage upload; give it headroom above
// the 10s platform default for larger uploads.
export const maxDuration = 30;
import {
  guardRequest,
  jsonError,
  normalizeRoomCode,
  routeError,
  supabaseAdmin,
} from "../_utils/api";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const OUTPUT_SIZE = 512;

// file.type is just the browser's Content-Type guess for the picked file -
// client-supplied and easy to spoof - so this isn't the real security
// boundary (the mandatory sharp re-encode below is). It's a fast-fail:
// reject obviously-wrong files immediately, before spending CPU on a
// decode attempt, with a clear error instead of the generic decode-failure
// message.
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export async function POST(request: Request) {
  try {
    const requestError = await guardRequest(request, "upload-avatar", 10);
    if (requestError) return requestError;

    const formData = await request.formData();
    const file = formData.get("avatar");
    const roomCode = normalizeRoomCode(formData.get("roomCode"));

    if (!roomCode) {
      return jsonError("Valid room code is required", 400);
    }

    if (!(file instanceof File)) {
      return jsonError("Missing avatar file", 400);
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      return jsonError("Please upload a JPEG, PNG, WebP, GIF, or HEIC photo.", 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError("Avatar image is too large", 400);
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Always decode and re-encode as a fixed raster format, regardless of what
    // the client claimed the file was. This is the actual security boundary:
    // whatever came in (SVG/XML, a mislabeled file, garbage bytes), only
    // genuine pixel data ever reaches storage, and never with an attacker-
    // chosen filename, extension, or content-type.
    let outputBuffer: Buffer;
    try {
      outputBuffer = await sharp(inputBuffer)
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover" })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return jsonError("That file isn't a supported image. Please upload a photo instead.", 400);
    }

    const filePath = `${roomCode}/${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, outputBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);

    return Response.json({ avatarUrl: publicUrlData.publicUrl });
  } catch (error) {
    return routeError(error, "Failed to upload avatar:", "Failed to upload avatar");
  }
}
