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
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
  describeAvatar: (avatarUrl: string) =>
    sendJson<{ description?: string }>("/api/describe-avatar", { avatarUrl }),

  joinRoom: (body: {
    allowCreateRoom: boolean;
    avatarDescription: string | null;
    avatarUrl: string | null;
    name: string;
    roomCode: string;
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
};
