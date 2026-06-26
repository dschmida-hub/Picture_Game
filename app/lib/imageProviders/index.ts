import { imageConfig } from "../imageConfig";
import { generateWithOpenAI } from "./openai";
import { generateWithReplicate } from "./replicate";

export async function generateImageBuffer(prompt: string) {
  if (imageConfig.provider === "replicate") {
    return generateWithReplicate(prompt);
  }

  return generateWithOpenAI(prompt);
}
