import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
     quality: "low",
    });

    const imageBase64 = result.data?.[0]?.b64_json;

    return Response.json({
      imageUrl: `data:image/png;base64,${imageBase64}`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }
}