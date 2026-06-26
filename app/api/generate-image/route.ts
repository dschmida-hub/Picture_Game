import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { getActiveImageModel, getEstimatedImageCostCents, imageConfig } from "@/app/lib/imageConfig";
import { buildImagePrompt } from "@/app/lib/imagePrompt";
import { generateImageBuffer } from "@/app/lib/imageProviders";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

function parseLimit(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const MAX_IMAGES_PER_GAME = parseLimit(process.env.MAX_IMAGES_PER_GAME, 8);
const MAX_IMAGES_PER_ROOM = parseLimit(process.env.MAX_IMAGES_PER_ROOM, 300);
const MAX_IMAGES_PER_PLAYER_PER_GAME = parseLimit(process.env.MAX_IMAGES_PER_PLAYER_PER_GAME, 1);

type GenerateImageRequest = {
  roomCode?: unknown;
  gameId?: unknown;
  playerId?: unknown;
  submissionId?: unknown;
};

function parsePositiveInteger(value: unknown) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function wasImageRejected(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return /(safety|moderation|policy|rejected|blocked)/.test(message);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isBadRequestError(error: unknown) {
  if (error instanceof SyntaxError) return true;
  if (!(error instanceof Error)) return false;

  return error.message === "Request must be JSON" || error.message === "Request body is too large";
}

async function countGeneratedImages(filters: {
  gameId?: number;
  playerName?: string;
  roomCode: string;
}) {
  let query = supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("room_code", filters.roomCode)
    .not("image_url", "is", null);

  if (filters.gameId) {
    query = query.eq("game_id", filters.gameId);
  }

  if (filters.playerName) {
    query = query.eq("player_name", filters.playerName);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

async function countPlayerSubmissionsForGame({
  gameId,
  playerName,
  roomCode,
}: {
  gameId: number;
  playerName: string;
  roomCode: string;
}) {
  const { count, error } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("room_code", roomCode)
    .eq("game_id", gameId)
    .eq("player_name", playerName);

  if (error) throw error;

  return count || 0;
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

async function loadGenerationContext({
  roomCode,
  gameId,
  playerId,
  submissionId,
}: {
  roomCode: string;
  gameId: number;
  playerId: number;
  submissionId: number;
}) {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", playerId)
    .eq("room_code", roomCode)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player) return { error: jsonError("Player not found in this room", 403) };

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, room_code, stage, prompt, image_style")
    .eq("id", gameId)
    .eq("room_code", roomCode)
    .maybeSingle();

  if (gameError) throw gameError;
  if (!game) return { error: jsonError("Game not found", 404) };

  if (game.stage !== "submitting") {
    return { error: jsonError("This round is not accepting image submissions", 409) };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, game_id, room_code, player_name, prompt, image_url")
    .eq("id", submissionId)
    .eq("game_id", gameId)
    .eq("room_code", roomCode)
    .maybeSingle();

  if (submissionError) throw submissionError;

  if (!submission || submission.player_name !== player.name) {
    return { error: jsonError("Submission does not belong to this player", 403) };
  }

  if (submission.image_url) {
    return { error: jsonError("Image already generated for this submission", 409) };
  }

  const [gameImageCount, roomImageCount, playerGameImageCount, playerSubmissionCount] = await Promise.all([
    countGeneratedImages({ gameId, roomCode }),
    countGeneratedImages({ roomCode }),
    countGeneratedImages({ gameId, playerName: player.name, roomCode }),
    countPlayerSubmissionsForGame({ gameId, playerName: player.name, roomCode }),
  ]);

  if (playerSubmissionCount > 1) {
    return { error: jsonError("Only one submission is allowed per player each round", 409) };
  }

  if (playerGameImageCount >= MAX_IMAGES_PER_PLAYER_PER_GAME) {
    return { error: jsonError("You already generated an image for this round", 409) };
  }

  if (gameImageCount >= MAX_IMAGES_PER_GAME) {
    return { error: jsonError("This round has reached its image limit", 429) };
  }

  if (roomImageCount >= MAX_IMAGES_PER_ROOM) {
    return { error: jsonError("This room has reached its image generation limit", 429) };
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("name, avatar_description")
    .eq("room_code", roomCode);

  if (playersError) throw playersError;

  return {
    data: {
      player,
      game,
      submission,
      players: players || [],
    },
  };
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
      console.error("Failed to store gallery thumbnail:", thumbnailUploadError);
      return null;
    }

    return supabase.storage
      .from("game-images")
      .getPublicUrl(thumbnailPath).data.publicUrl;
  } catch (thumbnailError) {
    console.error("Failed to create gallery thumbnail:", thumbnailError);
    return null;
  }
}

async function updateGeneratedSubmission({
  submissionId,
  imageUrl,
  thumbnailUrl,
  caption,
  costCents,
}: {
  submissionId: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  costCents: number;
}) {
  const { error } = await supabase
    .from("submissions")
    .update({
      estimated_image_cost_cents: costCents,
      image_url: imageUrl,
      gallery_thumbnail_url: thumbnailUrl,
      image_caption: caption,
      image_model: getActiveImageModel(),
      image_provider: imageConfig.provider,
    })
    .eq("id", submissionId);

  if (error) throw error;
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
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "generate-image", {
      windowMs: 60_000,
      maxRequests: 8,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<GenerateImageRequest>(request, 2_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);

    if (!roomCode || !ROOM_CODE_PATTERN.test(roomCode) || !gameId || !playerId || !submissionId) {
      return jsonError("Valid room, game, player, and submission are required", 400);
    }

    const context = await loadGenerationContext({
      roomCode,
      gameId,
      playerId,
      submissionId,
    });

    if (context.error) return context.error;

    const { game, player, players, submission } = context.data;
    const answer = sanitizeText(submission.prompt, 160);
    const roundPrompt = sanitizeText(game.prompt, 300);

    if (!answer || !roundPrompt) {
      return jsonError("Submission and round prompt are required", 400);
    }

    const prompt = buildImagePrompt({
      answer,
      roundPrompt,
      imageStyle: game.image_style,
      players,
      playerName: player.name,
    });

    const [imageBuffer, caption] = await Promise.all([
      generateImageBuffer(prompt),
      generateGalleryCaption(answer, roundPrompt),
    ]);

    const { imageId, imageUrl } = await uploadGeneratedImage(imageBuffer);
    const thumbnailUrl = await uploadGalleryThumbnail(imageId, imageBuffer);
    const estimatedCostCents = getEstimatedImageCostCents();

    await updateGeneratedSubmission({
      submissionId: submission.id,
      imageUrl,
      thumbnailUrl,
      caption,
      costCents: estimatedCostCents,
    });
    await updateGameEstimatedCost(gameId);

    return Response.json({
      imageUrl,
      thumbnailUrl,
      caption,
      estimatedCostCents,
    });
  } catch (error) {
    console.error(error);
    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const rejected = wasImageRejected(error);
    const detail =
      error instanceof Error ? error.message : "Unknown image generation error";

    return Response.json(
      {
        error: rejected
          ? "That image request was rejected. Please adjust your answer and try again."
          : "Image generation failed",
        rejected,
        details: process.env.NODE_ENV === "development" ? detail : undefined,
        provider: imageConfig.provider,
      },
      { status: rejected ? 422 : 500 }
    );
  }
}
