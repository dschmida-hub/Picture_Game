import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await openai.images.generate({
     model: "gpt-image-1",
    prompt,
     size: "1024x1024",
     quality: "medium",
    });

const imageBase64 = result.data?.[0]?.b64_json;

if (!imageBase64) {
  return Response.json(
    { error: "Image generation returned no image" },
    { status: 500 }
  );
}

const imageBuffer = Buffer.from(imageBase64, "base64");
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
});
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }
}
