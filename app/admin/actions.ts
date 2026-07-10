"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { hasAdminSession } from "./auth";

type ReportStatus = "reviewed" | "dismissed" | "removed";

async function requireAdminSession() {
  if (!(await hasAdminSession())) {
    throw new Error("Unauthorized admin action");
  }
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function cleanRoomCode(formData: FormData) {
  return String(formData.get("roomCode") || "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 12);
}

async function getLatestGameId(roomCode: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("games")
    .select("id")
    .eq("room_code", roomCode)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("No game found for that room");

  return Number(data.id);
}

function adminRedirect(roomCode?: string) {
  redirect(roomCode ? `/admin?room=${roomCode}` : "/admin");
}

export async function forceRoomToLobby(formData: FormData) {
  await requireAdminSession();
  const roomCode = cleanRoomCode(formData);
  if (!roomCode) throw new Error("Missing room code");

  const supabase = getSupabaseAdmin();
  const gameId = await getLatestGameId(roomCode);
  const { error } = await supabase
    .from("games")
    .update({
      stage: "lobby",
      submission_deadline: null,
      voting_deadline: null,
    })
    .eq("id", gameId);

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath(`/game/${roomCode}`);
  adminRedirect(roomCode);
}

export async function revealReadyImages(formData: FormData) {
  await requireAdminSession();
  const roomCode = cleanRoomCode(formData);
  if (!roomCode) throw new Error("Missing room code");

  const supabase = getSupabaseAdmin();
  const gameId = await getLatestGameId(roomCode);
  const { error } = await supabase
    .from("games")
    .update({
      stage: "reveal",
      voting_deadline: null,
    })
    .eq("id", gameId);

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath(`/game/${roomCode}`);
  adminRedirect(roomCode);
}

export async function updateReportStatus(formData: FormData) {
  await requireAdminSession();
  const reportId = Number(formData.get("reportId"));
  const status = String(formData.get("status") || "") as ReportStatus;

  if (!Number.isFinite(reportId) || reportId <= 0) {
    throw new Error("Missing report id");
  }

  if (!["reviewed", "dismissed", "removed"].includes(status)) {
    throw new Error("Invalid report status");
  }

  const supabase = getSupabaseAdmin();
  const { data: report, error } = await supabase
    .from("image_reports")
    .update({ status })
    .eq("id", reportId)
    .select("submission_id")
    .single();

  if (error) throw error;

  if (status === "removed" && report?.submission_id) {
    const { error: hideError } = await supabase
      .from("submissions")
      .update({ hidden_at: new Date().toISOString() })
      .eq("id", report.submission_id);

    if (hideError) throw hideError;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

const PROMPT_TABLES = ["prompts", "cah_prompts", "most_likely_to_prompts"] as const;
type PromptTable = (typeof PROMPT_TABLES)[number];
const PROMPT_RATINGS = ["good", "ehhh", "bad"] as const;

function promptsRedirect(formData: FormData) {
  const params = new URLSearchParams();
  const table = String(formData.get("table") || "");
  const rating = String(formData.get("filterRating") || "");
  const show = String(formData.get("filterShow") || "");
  if (table) params.set("table", table);
  if (rating) params.set("rating", rating);
  if (show) params.set("show", show);
  const query = params.toString();
  redirect(query ? `/admin/prompts?${query}` : "/admin/prompts");
}

function requirePromptTable(formData: FormData): PromptTable {
  const table = String(formData.get("table") || "");
  if (!PROMPT_TABLES.includes(table as PromptTable)) {
    throw new Error("Invalid prompt table");
  }
  return table as PromptTable;
}

export async function togglePromptActive(formData: FormData) {
  await requireAdminSession();
  const table = requirePromptTable(formData);
  const promptId = Number(formData.get("promptId"));
  const active = String(formData.get("active")) === "true";

  if (!Number.isFinite(promptId) || promptId <= 0) {
    throw new Error("Missing prompt id");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).update({ active }).eq("id", promptId);

  if (error) throw error;

  revalidatePath("/admin/prompts");
  promptsRedirect(formData);
}

export async function setPromptRating(formData: FormData) {
  await requireAdminSession();
  const table = requirePromptTable(formData);
  const promptId = Number(formData.get("promptId"));
  const rating = String(formData.get("rating") || "");

  if (!Number.isFinite(promptId) || promptId <= 0) {
    throw new Error("Missing prompt id");
  }

  if (!PROMPT_RATINGS.includes(rating as (typeof PROMPT_RATINGS)[number])) {
    throw new Error("Invalid prompt rating");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).update({ prompt_rating: rating }).eq("id", promptId);

  if (error) throw error;

  revalidatePath("/admin/prompts");
  promptsRedirect(formData);
}

export async function toggleRoundHistoryVisibility(formData: FormData) {
  await requireAdminSession();
  const entryId = Number(formData.get("entryId"));
  const hide = String(formData.get("hide")) === "true";

  if (!Number.isFinite(entryId) || entryId <= 0) {
    throw new Error("Missing round history entry id");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("round_history")
    .update({ hidden_at: hide ? new Date().toISOString() : null })
    .eq("id", entryId);

  if (error) throw error;

  revalidatePath("/admin/showcase");
  revalidatePath("/");
  redirect("/admin/showcase");
}
