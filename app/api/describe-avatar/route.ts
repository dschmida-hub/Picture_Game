import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
  validatePublicSupabaseUrl,
} from "../_utils/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type DescribeAvatarRequest = {
  avatarUrl?: unknown;
};

export async function POST(req: Request) {
  try {
    const originError = checkSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(req, "describe-avatar", {
      windowMs: 60_000,
      maxRequests: 12,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<DescribeAvatarRequest>(req, 2_000);
    const avatarUrl = sanitizeText(body.avatarUrl, 600);

    if (!avatarUrl) {
      return NextResponse.json(
        { error: "Missing avatarUrl" },
        { status: 400 }
      );
    }

    if (!validatePublicSupabaseUrl(avatarUrl)) {
      return NextResponse.json(
        { error: "Invalid avatar URL" },
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
