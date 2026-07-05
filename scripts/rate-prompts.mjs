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
  /^(hi|hello|hey|test|testing|asdf|asdfgh|qwerty|lol|lmao|idk|idc|nothing|none|na|n\/a|meh|ok|okay|yes|no|maybe|blah|stuff|things?)$/i,
  /^[?.!,\s\-_]+$/, // punctuation / whitespace only
  /^(.)\1{4,}$/, // a single character repeated (e.g. "aaaaa")
];

// Offensive or harmful content — always rated "bad" so it can be filtered out.
const bannedPatterns = [
  // self-harm
  /\b(kill yourself|kys|suicide|suicidal|self[-\s]?harm|cut(ting)? myself)\b/i,
  // sexual violence / child exploitation
  /\b(rape|rapist|molest\w*|pedophile|pedo|child\s?porn|underage|cp)\b/i,
  // hate / extremism
  /\b(nazi|heil\s?hitler|kkk|white\s?power|ethnic\s?cleansing|genocide)\b/i,
  // slurs (severe, common set)
  /\b(n[i1]gg(er|a)|f[a4]gg?ot|retard(ed)?|tr[a4]nny|ch[i1]nk|k[i1]ke)\b/i,
  // graphic / explicit
  /\b(beheading|dismember\w*|bestiality|incest)\b/i,
];

// Junk that will not produce a fun image (links, handles, code, etc.).
const noisePatterns = [
  /https?:\/\/|www\.|\.com\b/i,
  /[@#][a-z0-9_]{2,}/i,
  /<[^>]+>|\{\{?|\}\}?/, // markup / template braces
];

function hasFillBlankCue(prompt) {
  return /_{2,}|\.{3,}|blank|fill in/i.test(prompt);
}

function hasClassicPromptCue(prompt) {
  return /\?|\bwhat|\bwhy|\bwhen|\bwhere|\bwho|\bhow|describe|invent|worst|best|most|least|weird|strange|unexpected|reveal|confess|secret|would you rather\b/i.test(
    prompt
  );
}

function ratePrompt(prompt, gameMode) {
  const trimmedPrompt = prompt.trim();
  const wordCount = trimmedPrompt.split(/\s+/).filter(Boolean).length;
  const uniqueWords = new Set(trimmedPrompt.toLowerCase().split(/\s+/).filter(Boolean)).size;

  if (!trimmedPrompt) return "ehhh";
  if (bannedPatterns.some((pattern) => pattern.test(trimmedPrompt))) return "bad";
  if (lowEffortPatterns.some((pattern) => pattern.test(trimmedPrompt))) return "bad";
  if (noisePatterns.some((pattern) => pattern.test(trimmedPrompt))) return "bad";
  if (trimmedPrompt.length < 18 || wordCount < 4) return "bad";
  // Mostly the same word repeated ("cat cat cat cat") reads as low effort.
  if (wordCount >= 4 && uniqueWords <= Math.ceil(wordCount / 3)) return "bad";
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
