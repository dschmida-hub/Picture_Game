import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { avatarUrl } = await req.json();

    if (!avatarUrl) {
      return NextResponse.json(
        { error: "Missing avatarUrl" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this person's visible appearance for cartoon image generation. Keep it under 45 words. Mention hair, facial hair, glasses, age range, build, clothing if visible, and distinctive visible traits. Do not guess identity, race, ethnicity, personality, or attractiveness.",
            },
            {
              type: "image_url",
              image_url: {
                url: avatarUrl,
              },
            },
          ],
        },
      ],
    });

    const description =
      response.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Describe avatar error:", error);
    return NextResponse.json(
      { error: "Failed to describe avatar" },
      { status: 500 }
    );
  }
}