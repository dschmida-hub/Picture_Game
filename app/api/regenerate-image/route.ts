import OpenAI from "openai";
import sharp from "sharp";
import {
  getActiveImageModel,
  getEstimatedImageCostCents,
  getMaxDailyImageSpendCents,
  imageConfig,
} from "@/app/lib/imageConfig";
import { buildImagePrompt } from "@/app/lib/imagePrompt";
import { generateImageBuffer } from "@/app/lib/imageProviders";
import { getRolling24HourSpendCents } from "@/app/lib/imageSpend";
import {
  guardRequest,
  isBadRequestError,
  jsonError,
  normalizeRoomCode,
  parsePositiveInteger,
  supabaseAdmin,
} from "../_utils/api";
import {
  checkRoomRateLimit,
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = supabaseAdmin;
const MAX_REGENERATIONS_PER_SUBMISSION = Number(
  process.env.MAX_REGENERATIONS_PER_SUBMISSION || "2"
);

type RegenerateImageRequest = {
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  submissionId?: unknown;
};

function wasImageRejected(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return /(safety|moderation|policy|rejected|blocked)/.test(message);
}

async function generateGalleryCaption(answer: string, roundPrompt: string) {
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions:
        "Write one funny, spoiler-free gallery title for a party-game image. " +
        "Use 3 to 6 words. Do not quote, repeat, or closely paraphrase the player's answer. " +
        "Do not mention the player, do not use quotation marks, and return only the title.",
      input: `Round prompt: ${roundPrompt}\nPlayer answer: ${answer}`,
    });

    const caption = response.output_text
      .trim()
      .replace(/[\r\n]+/g, " ")
      .replace(/\|\|\|/g, "")
      .replace(/^['\"]|['\"]$/g, "");

    return caption || "Untitled Masterpiece";
  } catch (error) {
    console.error("Failed to generate gallery caption:", error);
    return "Untitled Masterpiece";
  }
}

async function uploadGeneratedImage(imageBuffer: Buffer) {
  const imageId = crypto.randomUUID();
  const filePath = `generated/${imageId}.png`;

  const { error: uploadError } = await supabase.storage
    .from("game-images")
    .upload(filePath, imageBuffer, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("game-images")
    .getPublicUrl(filePath);

  return {
    imageId,
    imageUrl: publicUrlData.publicUrl,
  };
}

async function uploadGalleryThumbnail(imageId: string, imageBuffer: Buffer) {
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
      console.error("Failed to store regenerated thumbnail:", thumbnailUploadError);
      return null;
    }

    return supabase.storage
      .from("game-images")
      .getPublicUrl(thumbnailPath).data.publicUrl;
  } catch (thumbnailError) {
    console.error("Failed to create regenerated thumbnail:", thumbnailError);
    return null;
  }
}

async function updateGameEstimatedCost(gameId: number) {
  const { data, error } = await supabase
    .from("submissions")
    .select("estimated_image_cost_cents")
    .eq("game_id", gameId)
    .not("image_url", "is", null);

  if (error) throw error;

  const totalCostCents = (data || []).reduce(
    (sum, submission) => sum + Number(submission.estimated_image_cost_cents || 0),
    0
  );

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({ estimated_image_cost_cents: totalCostCents })
    .eq("id", gameId);

  if (gameUpdateError) throw gameUpdateError;
}

export async function POST(request: Request) {
  try {
    const requestError = guardRequest(request, "regenerate-image", 6);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<RegenerateImageRequest>(request, 2_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);

    if (!roomCode || !gameId || !playerId || !submissionId) {
      return jsonError("Valid room, game, player, and submission are required", 400);
    }

    const roomRateLimitError = checkRoomRateLimit("regenerate-image", roomCode, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (roomRateLimitError) return roomRateLimitError;

    const rolling24HourSpendCents = await getRolling24HourSpendCents();
    if (rolling24HourSpendCents + getEstimatedImageCostCents() > getMaxDailyImageSpendCents()) {
      return jsonError("Image generation is temporarily paused while we're over budget for the day. Please try again later.", 429);
    }

    const { data: host, error: hostError } = await supabase
      .from("players")
      .select("id, name, is_host")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (hostError) throw hostError;
    if (!host?.is_host) return jsonError("Only the host can regenerate images", 403);

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, room_code, stage, prompt, image_style")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return jsonError("Game not found", 404);
    if (game.stage !== "reveal" && game.stage !== "winner") {
      return jsonError("Images can only be regenerated after reveal", 409);
    }

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, game_id, room_code, player_name, prompt, image_url, estimated_image_cost_cents, regenerate_count")
      .eq("id", submissionId)
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (submissionError) throw submissionError;
    if (!submission?.image_url) return jsonError("Generated image not found", 404);

    const regenerateCount = Number(submission.regenerate_count || 0);
    if (regenerateCount >= MAX_REGENERATIONS_PER_SUBMISSION) {
      return jsonError("This image has reached its regeneration limit", 429);
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("name, avatar_description")
      .eq("room_code", roomCode);

    if (playersError) throw playersError;

    const answer = sanitizeText(submission.prompt, 160);
    const roundPrompt = sanitizeText(game.prompt, 300);

    if (!answer || !roundPrompt) {
      return jsonError("Submission and round prompt are required", 400);
    }

    const prompt = buildImagePrompt({
      answer,
      roundPrompt,
      imageStyle: game.image_style,
      players: players || [],
      playerName: submission.player_name,
    });

    const [imageBuffer, caption] = await Promise.all([
      generateImageBuffer(prompt),
      generateGalleryCaption(answer, roundPrompt),
    ]);

    const { imageId, imageUrl } = await uploadGeneratedImage(imageBuffer);
    const thumbnailUrl = await uploadGalleryThumbnail(imageId, imageBuffer);
    const estimatedCostCents = getEstimatedImageCostCents();

    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        estimated_image_cost_cents:
          Number(submission.estimated_image_cost_cents || 0) + estimatedCostCents,
        gallery_thumbnail_url: thumbnailUrl,
        image_caption: caption,
        image_model: getActiveImageModel(),
        image_provider: imageConfig.provider,
        image_url: imageUrl,
        regenerate_count: regenerateCount + 1,
      })
      .eq("id", submission.id);

    if (updateError) throw updateError;

    await updateGameEstimatedCost(gameId);

    return Response.json({
      caption,
      estimatedCostCents,
      imageUrl,
      regenerateCount: regenerateCount + 1,
      thumbnailUrl,
    });
  } catch (error) {
    console.error("Failed to regenerate image:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const rejected = wasImageRejected(error);

    return Response.json(
      {
        error: rejected
          ? "That regeneration was rejected. Try deleting the submission or keeping the current image."
          : "Image regeneration failed",
        rejected,
        provider: imageConfig.provider,
      },
      { status: rejected ? 422 : 500 }
    );
  }
}
