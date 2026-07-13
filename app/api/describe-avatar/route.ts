import OpenAI from "openai";
import { NextResponse } from "next/server";

// Calls an external vision API; give it headroom above the 10s platform
// default in case of a slow response.
export const maxDuration = 30;
import { getRolling24HourSpendCents } from "@/app/lib/imageSpend";
import { normalizeRoomCode } from "../_utils/api";
import {
  checkRateLimit,
  checkRoomRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
  validatePublicSupabaseUrl,
} from "../_utils/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Vision calls here are cheap (fractions of a cent), so this isn't worth
// its own atomic reservation the way image generation is - but a burst of
// them should still stop once the room's real image spend is already
// over budget, on top of the room+player validation and rate limits below.
const MAX_DAILY_SPEND_CENTS = Number(process.env.MAX_DAILY_IMAGE_SPEND_CENTS || "5000");

type DescribeAvatarRequest = {
  avatarUrl?: unknown;
  roomCode?: unknown;
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
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!avatarUrl || !roomCode) {
      return NextResponse.json(
        { error: "Missing avatarUrl or roomCode" },
        { status: 400 }
      );
    }

    if (!validatePublicSupabaseUrl(avatarUrl)) {
      return NextResponse.json(
        { error: "Invalid avatar URL" },
        { status: 400 }
      );
    }

    // Avatars are uploaded to storage under `${roomCode}/...` (see
    // upload-avatar/route.ts) - requiring the claimed roomCode to match
    // the one baked into the file's own path ties this call to a room
    // that actually generated the avatar, instead of accepting any
    // Supabase-hosted URL from anyone.
    let avatarPath: string;
    try {
      avatarPath = new URL(avatarUrl).pathname;
    } catch {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }

    if (!avatarPath.includes(`/avatars/${roomCode}/`)) {
      return NextResponse.json({ error: "Avatar URL does not match room" }, { status: 400 });
    }

    const roomRateLimitError = checkRoomRateLimit("describe-avatar", roomCode, {
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (roomRateLimitError) return roomRateLimitError;

    const rolling24HourSpendCents = await getRolling24HourSpendCents();
    if (rolling24HourSpendCents >= MAX_DAILY_SPEND_CENTS) {
      return NextResponse.json(
        { error: "Temporarily paused while we're over budget for the day. Please try again later." },
        { status: 429 }
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
