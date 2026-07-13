import { ensureAnonymousSession } from "@/lib/supabase";

type JsonMethod = "DELETE" | "POST";

export type JsonResult<T> = {
  data: T | null;
  error: string | null;
  ok: boolean;
};

async function sendJson<T>(
  url: string,
  body: Record<string, unknown>,
  method: JsonMethod = "POST"
): Promise<JsonResult<T>> {
  // Every route that acts on behalf of a specific player verifies this
  // against that player's row (see verifyRequestPlayer in
  // app/api/_utils/api.ts) - attached here so no call site has to
  // remember to do it. A body that already sets accessToken (joinRoom)
  // wins over this default.
  const accessToken = await ensureAnonymousSession();

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, ...body }),
  });

  const data = await response.json().catch(() => null);

  return {
    data,
    error: response.ok ? null : data?.error || "Something went wrong.",
    ok: response.ok,
  };
}

type RoomPlayerPayload = {
  gameId: number;
  playerId: string;
  roomCode: string;
};

export type JoinRoomResponse = {
  isHost: boolean;
  playerId: number;
  playerName: string;
};

export type SubmitAnswerResponse = {
  submissionId: number;
};

export type GenerateImageResponse = {
  rejected?: boolean;
};

export type VoteResponse = {
  stage: "lobby" | "submitting" | "generating" | "reveal" | "winner";
};

export const gameApi = {
  describeAvatar: (avatarUrl: string, roomCode: string) =>
    sendJson<{ description?: string }>("/api/describe-avatar", { avatarUrl, roomCode }),

  joinRoom: (body: {
    accessToken: string | null;
    allowCreateRoom: boolean;
    avatarDescription: string | null;
    avatarUrl: string | null;
    name: string;
    roomCode: string;
    skipAutoHost: boolean;
  }) => sendJson<JoinRoomResponse>("/api/join-room", body),

  submitAnswer: (body: RoomPlayerPayload & { answer: string }) =>
    sendJson<SubmitAnswerResponse>("/api/submit-answer", body),

  generateImage: (body: RoomPlayerPayload & { submissionId: number }) =>
    sendJson<GenerateImageResponse>("/api/generate-image", body),

  deletePendingSubmission: (body: RoomPlayerPayload & { submissionId: number }) =>
    sendJson("/api/submit-answer", body, "DELETE"),

  vote: (body: RoomPlayerPayload & { answerText: string; votedForPlayerName: string }) =>
    sendJson<VoteResponse>("/api/vote", body),

  rateImage: (body: RoomPlayerPayload & { rating: "funny" | "meh" | "bad"; submissionId: number }) =>
    sendJson("/api/image-feedback", body),

  reportImage: (body: RoomPlayerPayload & { submissionId: number }) =>
    sendJson("/api/image-report", body),

  regenerateImage: (body: RoomPlayerPayload & { submissionId: number }) =>
    sendJson("/api/regenerate-image", body),

  logEvent: (
    body: RoomPlayerPayload & {
      eventName: "round_started" | "game_completed" | "room_returned_to_lobby" | "rematch_started";
      metadata?: Record<string, unknown>;
      stage?: string;
    }
  ) => sendJson("/api/game-event", body),
};
