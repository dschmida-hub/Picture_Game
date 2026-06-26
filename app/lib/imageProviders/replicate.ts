import { imageConfig } from "../imageConfig";

export async function generateWithReplicate(prompt: string) {
  const replicateApiToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiToken) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateApiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
      "Cancel-After": "90s",
    },
    body: JSON.stringify({
      version: imageConfig.replicate.model,
      input: {
        prompt,
        go_fast: true,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
      },
    }),
  });

  let data = await response.json();

  if (!response.ok) {
    console.error("Replicate image generation failed:", data);
    throw new Error(data?.detail || data?.error || "Replicate image generation failed");
  }

  const getUrl = data?.urls?.get;

  for (let attempt = 0; data.status === "starting" || data.status === "processing"; attempt += 1) {
    if (!getUrl || attempt >= 12) break;

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const statusResponse = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${replicateApiToken}`,
      },
    });

    data = await statusResponse.json();

    if (!statusResponse.ok) {
      console.error("Failed to poll Replicate prediction:", data);
      throw new Error(data?.detail || data?.error || "Failed to poll Replicate prediction");
    }
  }

  if (data.status !== "succeeded") {
    console.error("Replicate prediction did not succeed:", data);
    throw new Error(data?.error || `Replicate image generation did not finish: ${data.status}`);
  }

  const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;

  if (!imageUrl) {
    throw new Error("Replicate returned no image");
  }

  const imageResponse = await fetch(imageUrl, {
    headers: {
      Authorization: `Bearer ${replicateApiToken}`,
    },
  });

  if (!imageResponse.ok) {
    throw new Error(`Failed to download Replicate image: ${imageResponse.status}`);
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}
