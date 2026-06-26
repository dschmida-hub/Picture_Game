import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { imageConfig } from "@/app/lib/imageConfig";
import { generateImageBuffer } from "@/app/lib/imageProviders";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function wasImageRejected(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return /(safety|moderation|policy|rejected|blocked)/.test(message);
}

async function generateGalleryCaption(answer: string, roundPrompt: string) {
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions:
        "Write one funny, spoiler-free gallery title for a party-game image. " +
        "Use 3 to 6 words. Do not quote, repeat, or closely paraphrase the player's answer. " +
        "Do not mention the player, do not use quotation marks, and return only the title.",
      input: `Round prompt: ${roundPrompt}\nPlayer answer: ${answer}`,
    });

    const caption = response.output_text
      .trim()
      .replace(/[\r\n]+/g, " ")
      .replace(/\|\|\|/g, "")
      .replace(/^['\"]|['\"]$/g, "");

    return caption || "Untitled Masterpiece";
  } catch (error) {
    console.error("Failed to generate gallery caption:", error);
    return "Untitled Masterpiece";
  }
}

type GenerateImageRequest = {
  prompt?: unknown;
  answer?: unknown;
  roundPrompt?: unknown;
};

export async function POST(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "generate-image", {
      windowMs: 60_000,
      maxRequests: 8,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<GenerateImageRequest>(request, 16_000);
    const prompt = sanitizeText(body.prompt, 4_000);
    const answer = sanitizeText(body.answer, 160);
    const roundPrompt = sanitizeText(body.roundPrompt, 300);

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!answer || !roundPrompt) {
      return Response.json({ error: "Answer and round prompt are required" }, { status: 400 });
    }

    const [imageBuffer, caption] = await Promise.all([
      generateImageBuffer(prompt),
      generateGalleryCaption(answer, roundPrompt),
    ]);

const imageId = crypto.randomUUID();
const filePath = `generated/${imageId}.png`;

const { error: uploadError } = await supabase.storage
  .from("game-images")
  .upload(filePath, imageBuffer, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false,
  });

if (uploadError) {
  console.error(uploadError);
  return Response.json(
    { error: "Failed to store generated image" },
    { status: 500 }
  );
}

const { data: publicUrlData } = supabase.storage
  .from("game-images")
  .getPublicUrl(filePath);

let thumbnailUrl: string | null = null;

try {
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
  const thumbnailPath = `generated/thumbnails/${imageId}.webp`;

  const { error: thumbnailUploadError } = await supabase.storage
    .from("game-images")
    .upload(thumbnailPath, thumbnailBuffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });

  if (thumbnailUploadError) {
    console.error("Failed to store gallery thumbnail:", thumbnailUploadError);
  } else {
    thumbnailUrl = supabase.storage
      .from("game-images")
      .getPublicUrl(thumbnailPath).data.publicUrl;
  }
} catch (thumbnailError) {
  console.error("Failed to create gallery thumbnail:", thumbnailError);
}

return Response.json({
  imageUrl: publicUrlData.publicUrl,
  thumbnailUrl,
  caption,
});
  } catch (error) {
    console.error(error);
    const rejected = wasImageRejected(error);
    const detail =
      error instanceof Error ? error.message : "Unknown image generation error";

    return Response.json(
      {
        error: rejected
          ? "That image request was rejected. Please adjust your answer and try again."
          : "Image generation failed",
        rejected,
        details: process.env.NODE_ENV === "development" ? detail : undefined,
        provider: imageConfig.provider,
      },
      { status: rejected ? 422 : 500 }
    );
  }
}
