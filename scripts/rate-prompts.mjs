import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const lowEffortPatterns = [
  /^(hi|hello|test|asdf|lol|idk|nothing|none)$/i,
  /^[?.!,\s]+$/,
];

const bannedPatterns = [
  /\b(kill yourself|suicide|rape|nazi)\b/i,
];

function hasFillBlankCue(prompt) {
  return /_{2,}|\.{3,}|blank|fill in/i.test(prompt);
}

function hasClassicPromptCue(prompt) {
  return /\?|what|why|when|where|who|how|describe|invent|worst|best|most|least|unexpected|would you rather/i.test(
    prompt
  );
}

function ratePrompt(prompt, gameMode) {
  const trimmedPrompt = prompt.trim();
  const wordCount = trimmedPrompt.split(/\s+/).filter(Boolean).length;

  if (!trimmedPrompt) return "ehhh";
  if (bannedPatterns.some((pattern) => pattern.test(trimmedPrompt))) return "bad";
  if (lowEffortPatterns.some((pattern) => pattern.test(trimmedPrompt))) return "bad";
  if (trimmedPrompt.length < 18 || wordCount < 4) return "bad";
  if (trimmedPrompt.length > 150) return "ehhh";

  if (gameMode === "cards") {
    if (hasFillBlankCue(trimmedPrompt)) return "good";
    if (trimmedPrompt.length >= 40) return "ehhh";
    return "bad";
  }

  if (hasClassicPromptCue(trimmedPrompt)) return "good";
  if (wordCount >= 7) return "ehhh";

  return "bad";
}

async function rateTable({ supabase, tableName, gameMode }) {
  const { data, error } = await supabase
    .from(tableName)
    .select("id, prompt, prompt_rating");

  if (error) throw error;

  let changed = 0;
  const counts = { good: 0, ehhh: 0, bad: 0 };

  for (const row of data || []) {
    const rating = ratePrompt(row.prompt || "", gameMode);
    counts[rating] += 1;

    if (row.prompt_rating === rating) continue;

    const { error: updateError } = await supabase
      .from(tableName)
      .update({ prompt_rating: rating })
      .eq("id", row.id);

    if (updateError) throw updateError;
    changed += 1;
  }

  console.log(`${tableName}: updated ${changed}/${data?.length || 0}`, counts);
}

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

await rateTable({ supabase, tableName: "prompts", gameMode: "classic" });
await rateTable({ supabase, tableName: "cah_prompts", gameMode: "cards" });
