import OpenAI from "openai";
import { imageConfig } from "../imageConfig";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWithOpenAI(prompt: string) {
  const result = await openai.images.generate({
    model: imageConfig.openai.model,
    prompt,
    size: imageConfig.openai.size as "1024x1024",
    quality: imageConfig.openai.quality,
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("Image generation returned no image");
  }

  return Buffer.from(imageBase64, "base64");
}
