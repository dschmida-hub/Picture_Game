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
  estimatedCostCents: Number(process.env.ESTIMATED_IMAGE_COST_CENTS || "1"),
  openai: {
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini",
    size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
    quality: getOpenAIImageQuality(process.env.OPENAI_IMAGE_QUALITY),
  },
  replicate: {
    model: process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell",
  },
};

export function getActiveImageModel() {
  return imageConfig.provider === "replicate"
    ? imageConfig.replicate.model
    : imageConfig.openai.model;
}

export function getEstimatedImageCostCents() {
  return Number.isFinite(imageConfig.estimatedCostCents) && imageConfig.estimatedCostCents >= 0
    ? imageConfig.estimatedCostCents
    : 1;
}

export function getMaxDailyImageSpendCents() {
  const configuredValue = Number(process.env.MAX_DAILY_IMAGE_SPEND_CENTS || "5000");
  return Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 5000;
}
