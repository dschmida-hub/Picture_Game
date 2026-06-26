export type ImageProvider = "openai" | "replicate";
export type OpenAIImageQuality = "low" | "medium" | "high" | "auto";

function getImageProvider(value: string | undefined): ImageProvider {
  if (value === "replicate" || value === "openai") {
    return value;
  }

  return "openai";
}

function getOpenAIImageQuality(value: string | undefined): OpenAIImageQuality {
  if (value === "low" || value === "medium" || value === "high" || value === "auto") {
    return value;
  }

  return "medium";
}

export const imageConfig = {
  provider: getImageProvider(process.env.IMAGE_PROVIDER),
  openai: {
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini",
    size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
    quality: getOpenAIImageQuality(process.env.OPENAI_IMAGE_QUALITY),
  },
  replicate: {
    model: process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell",
  },
};
