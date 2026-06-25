"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GeneratingScreen } from "./components/GeneratingScreen";
import { GameLogo } from "./components/GameLogo";
import { JoinRoomForm } from "./components/JoinRoomForm";
import { LobbyScreen } from "./components/LobbyScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { RoundPromptCard } from "./components/RoundPromptCard";
import { SubmissionForm } from "./components/SubmissionForm";
import { VotingScreen } from "./components/VotingScreen";
import { WinnerScreen } from "./components/WinnerScreen";
import { parseSubmission } from "./components/submissions";
import type { GameMode, Player, PromptSuggestion, RoundHistoryItem, ScoreboardPlayer } from "./components/types";

type GameStage = "lobby" | "submitting" | "generating" | "reveal" | "winner";
type PromptSource = GameMode | `custom_${GameMode}`;
type PromptOption = { id: number; prompt: string; image_style: string | null; source: PromptSource };

const imageStyleInstructions: Record<string, string> = {
  cartoon: "Bright, colorful cartoon illustration with big expressive faces",
  comic_book: "Dynamic comic-book art with bold ink outlines and dramatic color",
  clay_animation: "Playful handcrafted clay-animation style with soft studio lighting",
  storybook: "Whimsical illustrated storybook art with rich, charming detail",
  pixel_art: "Detailed retro pixel-art scene with expressive characters",
};
const MAX_PLAYERS = 8;

function getImageStyleInstruction(style: string | null) {
  return imageStyleInstructions[style || "cartoon"] || imageStyleInstructions.cartoon;
}

function resolveImageStyle(promptStyle: string | null, selectedStyle: string) {
  return selectedStyle === "prompt" ? promptStyle || "cartoon" : selectedStyle;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function getImageStyleLabel(style: string) {
  return style.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function doesTextMentionName(text: string, playerName: string) {
  const trimmedName = playerName.trim();
  if (trimmedName.length < 2) return false;

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(trimmedName.toLowerCase())}([^a-z0-9]|$)`, "i");
  return pattern.test(text.toLowerCase());
}

function buildPlayerAppearanceContext(players: Player[], currentPlayerName: string, answer: string) {
  const trimmedAnswer = answer.trim();
  const currentPlayer = players.find((player) => player.name === currentPlayerName);
  const namedPlayers = players.filter((player) => doesTextMentionName(trimmedAnswer, player.name));
  const mentionsSelf = /\b(i|me|my|mine|myself)\b/i.test(trimmedAnswer);
  const relevantPlayers = [...namedPlayers];

  if (mentionsSelf && currentPlayer && !relevantPlayers.some((player) => player.name === currentPlayer.name)) {
    relevantPlayers.push(currentPlayer);
  }

  const playersToDescribe = relevantPlayers.length > 0 ? relevantPlayers : currentPlayer ? [currentPlayer] : [];

  if (playersToDescribe.length === 0) {
    return "No specific player appearance is available. Use a generic funny character.";
  }

  return playersToDescribe
    .map((player) => `${player.name}: ${player.avatar_description || "Generic person"}`)
    .join("\n");
}

const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  color: ["#9810fa", "#facc15", "#ec4899", "#22c55e", "#38bdf8"][index % 5],
  delay: `${(index % 7) * 0.14}s`,
  left: `${(index * 37) % 100}%`,
  rotation: `${(index * 53) % 360}deg`,
}));

export default function GameRoom() {
  const params = useParams();
  const code = params.code as string;
  const playerStorageKey = `picture-this:${code}:player-id`;

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<GameStage>("lobby");
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [submission, setSubmission] = useState("");
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [winner, setWinner] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [scoreboardPlayers, setScoreboardPlayers] = useState<ScoreboardPlayer[]>([]);
  const [finalWinner, setFinalWinner] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Generating chaos...");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Random");
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>("classic");
  const [selectedImageStyle, setSelectedImageStyle] = useState("prompt");
  const [selectedRoundDuration, setSelectedRoundDuration] = useState<number | "unlimited">(90);
  const [selectedVotingDuration, setSelectedVotingDuration] = useState(45);
  const [isRoundCustomizationOpen, setIsRoundCustomizationOpen] = useState(false);
  const [showRoundIntro, setShowRoundIntro] = useState(false);
  const [roundDeadline, setRoundDeadline] = useState<string | null>(null);
  const [votingDeadline, setVotingDeadline] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);
  const [isForcingStage, setIsForcingStage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomShareMessage, setRoomShareMessage] = useState("");
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([]);
  const [promptSuggestionText, setPromptSuggestionText] = useState("");
  const [promptSuggestionMode, setPromptSuggestionMode] = useState<GameMode>("classic");
  const [isSubmittingPromptSuggestion, setIsSubmittingPromptSuggestion] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");
  const [winnerImageUrl, setWinnerImageUrl] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [winnerPrompt, setWinnerPrompt] = useState("");
  const [winnerImages, setWinnerImages] = useState<string[]>([]);
  const hostName = players.find((player) => player.is_host)?.name;
  const isHost = joined && name === hostName;
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [pastImages, setPastImages] = useState<string[]>([]);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [isGalleryImageVisible, setIsGalleryImageVisible] = useState(true);
  const hasSubmitted = submissions.some((item) => {
  return parseSubmission(item).playerName === name;
});
  const hasCurrentRoundImage = submissions.some((item) =>
    Boolean(parseSubmission(item).imageUrl)
  );
  const currentGalleryImage = pastImages[galleryImageIndex % pastImages.length];
  const timeRemainingSeconds = roundDeadline
    ? Math.max(0, Math.ceil((new Date(roundDeadline).getTime() - currentTime) / 1000))
    : null;
  const isSubmissionTimeExpired = timeRemainingSeconds === 0;
  const votingTimeRemainingSeconds = votingDeadline
    ? Math.max(0, Math.ceil((new Date(votingDeadline).getTime() - currentTime) / 1000))
    : null;
  const isVotingTimeExpired = votingTimeRemainingSeconds === 0;
  const currentRoundNumber = roundHistory.reduce(
    (highestRound, round) => Math.max(highestRound, round.round_number || 0),
    0
  ) + 1;
  const promptApprovalVotesNeeded = Math.max(2, Math.ceil(players.length / 2));

  useEffect(() => {
    if (stage !== "submitting" || !currentGameId) return;

    setShowRoundIntro(true);
    const timeout = window.setTimeout(() => setShowRoundIntro(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [currentGameId, stage]);

  useEffect(() => {
    const activeDeadline = stage === "submitting" ? roundDeadline : stage === "reveal" ? votingDeadline : null;
    if (!activeDeadline) return;

    setCurrentTime(Date.now());
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [roundDeadline, stage, votingDeadline]);

  useEffect(() => {
    const shouldShowGallery =
      isSubmitting && !hasCurrentRoundImage && pastImages.length > 0;

    if (!shouldShowGallery || pastImages.length < 2) return;

    let fadeTimeout: number | undefined;
    const interval = window.setInterval(() => {
      setIsGalleryImageVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setGalleryImageIndex((index) => (index + 1) % pastImages.length);
        setIsGalleryImageVisible(true);
      }, 450);
    }, 4500);

    return () => {
      window.clearInterval(interval);
      if (fadeTimeout) window.clearTimeout(fadeTimeout);
    };
  }, [hasCurrentRoundImage, isSubmitting, pastImages.length]);

  useEffect(() => {
    if (!joined || !name) return;
    loadPromptSuggestions();
  }, [joined, name]);

  const loadingMessages = [
  "Teaching raccoons wedding etiquette...",
  "Negotiating with angry alligators...",
  "Adding unnecessary explosions...",
  "Convincing the bride this is normal...",
  "Searching for maximum chaos...",
  "Making the image 37% funnier...",
];

  const [roundPrompt, setRoundPrompt] = useState("");
  const [roundImageStyle, setRoundImageStyle] = useState("cartoon");

async function pickRoundPrompt(): Promise<PromptOption | null> {
  let promptQuery;
  const basePromptSource: PromptSource = selectedGameMode;
  const customPromptSource: PromptSource = `custom_${selectedGameMode}`;

  if (selectedGameMode === "cards") {
    promptQuery = supabase
      .from("cah_prompts")
      .select("id, prompt, image_style")
      .eq("active", true);
  } else {
    promptQuery = supabase
      .from("prompts")
      .select("id, prompt, image_style")
      .eq("active", true);

    if (selectedCategory !== "Random") {
      promptQuery = promptQuery.eq("category", selectedCategory);
    }
  }

  const { data, error } = await promptQuery;

  if (error) {
    console.error("Failed to load prompts:", error);
    return null;
  }

  const basePrompts = ((data || []) as Array<{ id: number; prompt: string; image_style: string | null }>).map(
    (prompt) => ({ ...prompt, source: basePromptSource })
  );

  const approvedSuggestions = promptSuggestions
    .filter(
      (suggestion) =>
        suggestion.game_mode === selectedGameMode &&
        suggestion.vote_count >= promptApprovalVotesNeeded
    )
    .map((suggestion) => ({
      id: suggestion.id,
      prompt: suggestion.prompt,
      image_style: suggestion.image_style,
      source: customPromptSource,
    }));

  const allPrompts = [...basePrompts, ...approvedSuggestions];

  if (!allPrompts.length) return null;

  const { data: usedGames, error: usedGamesError } = await supabase
    .from("games")
    .select("prompt_id, prompt_source")
    .eq("room_code", code)
    .not("prompt_id", "is", null);

  if (usedGamesError) {
    console.error("Failed to load used prompts:", usedGamesError);
    return null;
  }

  const usedPromptKeys = new Set((usedGames || []).map((game) => `${game.prompt_source}:${game.prompt_id}`));
  const unusedPrompts = allPrompts.filter(
    (prompt) => !usedPromptKeys.has(`${prompt.source}:${prompt.id}`)
  );
  const promptDeck = unusedPrompts.length > 0 ? unusedPrompts : allPrompts;

  return promptDeck[Math.floor(Math.random() * promptDeck.length)];
}

async function loadRandomPrompt() {
  const randomPrompt = await pickRoundPrompt();

  if (!randomPrompt) return null;

  setRoundPrompt(randomPrompt.prompt);
  setRoundImageStyle(randomPrompt.image_style || "cartoon");

  return randomPrompt;
}
  async function loadPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("name, points, avatar_url, avatar_description, is_host")
    .eq("room_code", code)
    .order("is_host", { ascending: false })
    .order("points", { ascending: false })
    ;

  if (error) {
    console.error(error);
    return;
  }

  setPlayers(data);
}

async function loadRoundHistory() {
  const { data, error } = await supabase
    .from("round_history")
    .select("*")
    .eq("room_code", code)
    .order("round_number", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setRoundHistory(data || []);
}

async function loadPastImages() {
  const { data, error } = await supabase
    .from("round_history")
    .select("gallery_thumbnail_url, winner_image_url")
    .not("winner_image_url", "is", null)
    .order("id", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Failed to load past images:", error);
    return;
  }

  const images = (data || [])
    .map((round) => {
      if (round.gallery_thumbnail_url) return round.gallery_thumbnail_url;
      if (round.winner_image_url?.startsWith("data:")) return null;
      return round.winner_image_url;
    })
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  setPastImages(images.sort(() => Math.random() - 0.5).slice(0, 4));
}

async function loadPromptSuggestions() {
  const { data: suggestions, error: suggestionsError } = await supabase
    .from("room_prompt_suggestions")
    .select("id, prompt, game_mode, image_style, submitted_by")
    .eq("room_code", code)
    .order("id", { ascending: false });

  if (suggestionsError) {
    console.error("Failed to load prompt suggestions:", suggestionsError);
    return;
  }

  const suggestionIds = (suggestions || []).map((suggestion) => suggestion.id);

  if (!suggestionIds.length) {
    setPromptSuggestions([]);
    return;
  }

  const { data: votes, error: votesError } = await supabase
    .from("room_prompt_suggestion_votes")
    .select("suggestion_id, voter_name")
    .in("suggestion_id", suggestionIds);

  if (votesError) {
    console.error("Failed to load prompt suggestion votes:", votesError);
    return;
  }

  const voteCounts = new Map<number, number>();
  const votedByCurrentPlayer = new Set<number>();

  (votes || []).forEach((vote) => {
    voteCounts.set(vote.suggestion_id, (voteCounts.get(vote.suggestion_id) || 0) + 1);
    if (vote.voter_name === name) {
      votedByCurrentPlayer.add(vote.suggestion_id);
    }
  });

  setPromptSuggestions(
    (suggestions || []).map((suggestion) => ({
      id: suggestion.id,
      prompt: suggestion.prompt,
      game_mode: suggestion.game_mode as GameMode,
      image_style: suggestion.image_style,
      submitted_by: suggestion.submitted_by,
      vote_count: voteCounts.get(suggestion.id) || 0,
      has_voted: votedByCurrentPlayer.has(suggestion.id),
    }))
  );
}

async function submitPromptSuggestion() {
  const prompt = promptSuggestionText.trim();
  if (!joined || !name || !prompt || isSubmittingPromptSuggestion) return;

  setIsSubmittingPromptSuggestion(true);

  try {
    const { data: suggestion, error: suggestionError } = await supabase
      .from("room_prompt_suggestions")
      .insert({
        room_code: code,
        prompt,
        game_mode: promptSuggestionMode,
        image_style: selectedImageStyle === "prompt" ? "cartoon" : selectedImageStyle,
        submitted_by: name,
      })
      .select("id")
      .single();

    if (suggestionError) throw suggestionError;

    await supabase.from("room_prompt_suggestion_votes").insert({
      room_code: code,
      suggestion_id: suggestion.id,
      voter_name: name,
    });

    setPromptSuggestionText("");
    await loadPromptSuggestions();
  } catch (error) {
    console.error("Failed to submit prompt suggestion:", error);
    alert("Could not submit that prompt suggestion.");
  } finally {
    setIsSubmittingPromptSuggestion(false);
  }
}

async function voteForPromptSuggestion(suggestionId: number) {
  if (!joined || !name) return;

  const { error } = await supabase.from("room_prompt_suggestion_votes").insert({
    room_code: code,
    suggestion_id: suggestionId,
    voter_name: name,
  });

  if (error) {
    console.error("Failed to vote for prompt suggestion:", error);
    return;
  }

  await loadPromptSuggestions();
}

async function loadSubmissions(gameId = currentGameId) {
  if (!gameId) {
    setSubmissions([]);
    return;
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("player_name, prompt, image_url, image_caption")
    .eq("room_code", code)
    .eq("game_id", gameId)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setSubmissions(
  data.map(
    (item) =>
      `${item.prompt}|||${item.image_url}|||${item.player_name}|||${
        item.image_caption || "Untitled Masterpiece"
      }`
    )
  );
}

async function loadGame() {
  
  const { data, error } = await supabase
    .from("games")
    .select("id, stage, prompt, game_mode, image_style, submission_deadline, voting_deadline, voting_duration_seconds")
    .eq("room_code", code)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

 if (data) {
  setCurrentGameId(data.id);
  setStage(data.stage as GameStage);
  setRoundPrompt(data.prompt);
  setSelectedGameMode(data.game_mode as "classic" | "cards");
  setRoundImageStyle(data.image_style || "cartoon");
  setRoundDeadline(data.submission_deadline);
  setVotingDeadline(data.voting_deadline);
  setSelectedVotingDuration(data.voting_duration_seconds || 45);
  await loadSubmissions(data.id);
}
}

async function restoreJoinedPlayer() {
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) return;

  const { data, error } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", savedPlayerId)
    .eq("room_code", code)
    .maybeSingle();

  if (error) {
    console.error("Failed to restore player:", error);
    return;
  }

  if (!data) {
    window.localStorage.removeItem(playerStorageKey);
    return;
  }

  setName(data.name);
  setJoined(true);
}

useEffect(() => {
  if (stage === "winner") {
    loadWinner();
    loadRoundHistory();
  }
}, [stage]);

useEffect(() => {
  if (stage === "submitting") {
    setHasVoted(false);
    setVoteMessage("");
    setSubmission("");
    setWinner("");
    setPointsAwarded(false);
  }
}, [stage]);

useEffect(() => {
  if (stage === "winner") {
    loadWinner();
  }
}, [stage]);

useEffect(() => {
  async function loadInitialData() {
    setIsPageLoading(true);

    await Promise.all([
    loadPlayers(),
    loadGame(),
    loadSubmissions(),
    loadScoreboard(),
    loadPastImages(),
    loadRoundHistory(),
    loadPromptSuggestions(),

    ]);

    await restoreJoinedPlayer();

    setIsPageLoading(false);
  }

  loadInitialData();

  const interval = setInterval(() => {
  loadPlayers();
  loadGame();
  loadScoreboard();
  loadPromptSuggestions();
}, 2000);
  return () => clearInterval(interval);
}, []);

async function joinGame() {
  
  if (!name.trim()) return;
  
  if (isJoining) return;

  setIsJoining(true);

  try {

  const cleanName = name.trim();

  const { data: existingPlayer, error: existingPlayerError } = await supabase
    .from("players")
    .select("id, name")
    .eq("room_code", code)
    .eq("name", cleanName)
    .maybeSingle();

  if (existingPlayerError) {
    console.error(existingPlayerError);
    alert("Failed to check the room");
    return;
  }

  if (existingPlayer) {
    window.localStorage.setItem(playerStorageKey, String(existingPlayer.id));
    await loadPlayers();
    setJoined(true);
    return;
  }

  let avatarUrl = null;
  let avatarDescription = null;

  if (avatarFile) {
    const filePath = `${code}/${cleanName}-${Date.now()}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile);

    if (uploadError) {
      console.error(uploadError);
      alert("Failed to upload avatar");
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    avatarUrl = data.publicUrl;
try{
    const descResponse = await fetch("/api/describe-avatar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    avatarUrl,
  }),
});

const descData = await descResponse.json();
 avatarDescription = descData.description || null;
  }
   catch (error) {
  console.error("Avatar description failed:", error);
   }}

    const { count: playerCount, error: roomPlayersError } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("room_code", code);

    if (roomPlayersError) {
      console.error(roomPlayersError);
      alert("Failed to check the room host");
      return;
    }

    if ((playerCount || 0) >= MAX_PLAYERS) {
      alert("This room is full (8 players max).");
      return;
    }

    const isFirstPlayer = (playerCount || 0) === 0;

    const { data: newPlayer, error } = await supabase.from("players").insert([
      {
        name: cleanName,
        room_code: code,
        avatar_url: avatarUrl,
        avatar_description: avatarDescription,
        points: 0,
        is_host: isFirstPlayer,
      },
    ]).select("id").single();

    if (error) {
      console.error(error);
      alert("Failed to join room");
      return;
    }

    window.localStorage.setItem(playerStorageKey, String(newPlayer.id));

  await loadPlayers();
  await loadPromptSuggestions();
  setJoined(true);
  }finally {
  setIsJoining(false);
  }
}

async function copyRoomCode() {
  try {
    await navigator.clipboard.writeText(code);
    setRoomShareMessage("Room code copied!");
  } catch (error) {
    console.error("Failed to copy room code:", error);
    window.prompt("Copy this room code:", code);
  }
}

async function shareRoom() {
  const roomUrl = `${window.location.origin}/game/${code}`;

  if (!navigator.share) {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setRoomShareMessage("Game link copied!");
    } catch (error) {
      console.error("Failed to copy game link:", error);
      window.prompt("Copy this game link:", roomUrl);
    }
    return;
  }

  try {
    await navigator.share({
      title: "Picture This",
      text: `Join my Picture This game! Room code: ${code}`,
      url: roomUrl,
    });
  } catch (error) {
    // Closing the native share sheet is not an error the player needs to see.
    console.error("Share cancelled or failed:", error);
  }
}

async function startGame() {
  if (!isHost || isStarting) return;
  if (players.length < 2) {
    alert("Wait for at least one more player before starting.");
    return;
  }

  setIsStarting(true);

  try {
    const randomPrompt = await pickRoundPrompt();

    if (!randomPrompt) {
    alert(
      selectedGameMode === "cards"
      ? "No fill-in-the-blank prompts found"
      : "No prompts found for this category"
    );
  return;
  }

    const activeImageStyle = resolveImageStyle(
      randomPrompt.image_style,
      selectedImageStyle
    );
    const submissionDeadline =
      selectedRoundDuration === "unlimited"
        ? null
        : new Date(Date.now() + selectedRoundDuration * 1000).toISOString();

    console.log("Selected CAH prompt:", randomPrompt.prompt);

    const { data: newGame, error } = await supabase.from("games").insert([
      {
        room_code: code,
        stage: "submitting",
        prompt: randomPrompt.prompt,
        prompt_id: randomPrompt.id,
        prompt_source: randomPrompt.source,
        game_mode: selectedGameMode,
        image_style: activeImageStyle,
        submission_deadline: submissionDeadline,
        voting_duration_seconds: selectedVotingDuration,
        winner_awarded: false,
      },
    ]).select("id").single();

    if (error) {
      console.error(error);
      alert("Failed to start game");
      return;
    }

    setCurrentGameId(newGame.id);
    setRoundPrompt(randomPrompt.prompt);
    setRoundImageStyle(activeImageStyle);
    setRoundDeadline(submissionDeadline);
    setVotingDeadline(null);
    setStage("submitting");
  } finally {
    setIsStarting(false);
  }
}
async function grantImageRetryTime() {
  if (!currentGameId || !roundDeadline) return false;

  const retryDeadline = new Date(
    Math.max(new Date(roundDeadline).getTime(), Date.now()) + 60_000
  ).toISOString();

  const { error } = await supabase
    .from("games")
    .update({ submission_deadline: retryDeadline })
    .eq("id", currentGameId);

  if (error) {
    console.error("Failed to extend the submission timer:", error);
    return false;
  }

  setRoundDeadline(retryDeadline);
  return true;
}

 async function submitPrompt() {
  if (!submission.trim()) return;
  if (isSubmitting || hasSubmitted) return;
  if (isSubmissionTimeExpired) {
    alert("Time is up for this round.");
    return;
  }
  if (!currentGameId) {
    alert("The round is still loading. Please try again.");
    return;
  }
  const playerAppearanceContext = buildPlayerAppearanceContext(players, name, submission);

  setIsSubmitting(true);

  try {
    const imagePrompt = `
You are creating a hilarious party game image.

Question:
${roundPrompt}

Player Answer:
${submission.trim()}

Relevant Player Appearances:
${playerAppearanceContext}

If a player name is mentioned in the answer, use that named player's appearance for that character.
Only use the submitting player's appearance when the answer refers to them directly or no other player is named.

Turn this into a single funny visual scene.

The image should clearly show the connection between the question and answer.
The answer should be the main punchline, but the joke should be understandable without reading the answer.
Do not simply show the answer by itself.

Build the scene around the joke:
- Show what is happening
- Show why it is funny
- Add background chaos or small visual gags
- Exaggerate facial expressions and reactions
- Make the situation instantly understandable


Style rules:

${getImageStyleInstruction(roundImageStyle)}
Absurd comedy
Big expressive faces
Clear main subject
Focus on visual comedy
Make the joke immediately understandable
Make players laugh within 3 seconds

Speech and reactions:

Characters may be speaking, yelling, whispering, singing, arguing, reacting, or giving speeches
If the answer involves something being said, make it obvious through facial expressions, body language, mouth position, gestures, and the reactions of other characters
Treat spoken phrases as an important part of the joke
Build the scene around the impact of what was said

Text restrictions:

No captions
No labels
No signs
No posters
No logos

Comedy rules:

Exaggerate reactions
Exaggerate consequences
Make the answer the center of the joke
Show the funniest possible visual interpretation of the answer
Prefer visual comedy over realistic scenes
`;

console.log("AI PROMPT:");
console.log(imagePrompt);

    setLoadingMessage(
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
    );

    const imageResponse = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: imagePrompt,
        answer: submission.trim(),
        roundPrompt,
      }),
    });

    const imageData = await imageResponse.json();

    if (!imageResponse.ok) {
      console.error(imageData);
      if (imageData.rejected) {
        const wasExtended = await grantImageRetryTime();
        alert(
          wasExtended
            ? "The AI couldn't create that one. You have an extra minute to adjust your answer and try again."
            : "The AI couldn't create that one. Please adjust your answer and try again."
        );
      } else {
        alert("Image generation failed");
      }
      return;
    }

    const { error } = await supabase.from("submissions").insert([
      {
        room_code: code,
        game_id: currentGameId,
        player_name: name,
        prompt: submission.trim(),
        image_url: imageData.imageUrl,
        gallery_thumbnail_url: imageData.thumbnailUrl || null,
        image_caption: imageData.caption || "Untitled Masterpiece",
      },
    ]);

    if (error) {
      console.error(error);
      alert("Failed to submit prompt");
      return;
    }

    setSubmission("");
    await loadSubmissions(currentGameId);

    const { data: allPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("room_code", code);

    const { data: allSubmissions } = await supabase
      .from("submissions")
      .select("id, image_url")
      .eq("game_id", currentGameId);

    const everyoneSubmitted =
      allPlayers &&
      allSubmissions &&
      allSubmissions.length >= allPlayers.length;

    const allImagesReady =
      allSubmissions &&
      allSubmissions.every((item) => item.image_url);

    if (everyoneSubmitted && allImagesReady) {
      const nextVotingDeadline = new Date(
        Date.now() + selectedVotingDuration * 1000
      ).toISOString();
      const { error: gameError } = await supabase
        .from("games")
        .update({ stage: "reveal", voting_deadline: nextVotingDeadline })
        .eq("id", currentGameId);

      if (gameError) {
        console.error(gameError);
        return;
      }

      setStage("reveal");
      setVotingDeadline(nextVotingDeadline);
    }
  } finally {
    setIsSubmitting(false);
  }
}

async function voteForSubmission(answerText: string, playerName: string) {
  if (hasVoted) return;
  if (!currentGameId) return;
  const allowSelfVoting = players.length === 2;

  if (playerName === name && !allowSelfVoting) {
    alert("You can't vote for your own submission.");
    return;
  }
  if (isVotingTimeExpired) {
    alert("Voting time is up.");
    return;
  }

  const voteValue = `${playerName}: ${answerText}`;

  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("game_id", currentGameId)
    .eq("voter_name", name)
    .maybeSingle();

  if (existingVote) return;

  setHasVoted(true);

  const { error } = await supabase.from("votes").insert([
    {
      room_code: code,
      game_id: currentGameId,
      voter_name: name,
      voted_for: voteValue,
    },
  ]);

  if (error) {
    console.error(error);
    alert("Failed to vote");
    setHasVoted(false);
    return;
  }

  setVoteMessage("✅ Vote recorded! Waiting for other players...");

  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id")
    .eq("game_id", currentGameId);

  const { data: allVotes } = await supabase
    .from("votes")
    .select("id")
    .eq("game_id", currentGameId);

  if (allSubmissions && allVotes && allVotes.length >= allSubmissions.length) {
  const { error: stageError } = await supabase
  .from("games")
  .update({ stage: "winner" })
  .eq("id", currentGameId);

if (stageError) {
  console.error("Failed to update stage:", stageError);
  alert("Failed to move to winner screen");
  return;
}

console.log("Stage updated to winner");
setStage("winner");
await loadGame();
  }

}

async function forceReveal() {
  if (!isHost || !currentGameId || isForcingStage) return;

  setIsForcingStage(true);

  try {
    const { data: readySubmissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id")
      .eq("game_id", currentGameId);

    if (submissionsError) throw submissionsError;

    if (!readySubmissions?.length) {
      alert("At least one finished image is needed before reveal.");
      return;
    }

    const nextVotingDeadline = new Date(
      Date.now() + selectedVotingDuration * 1000
    ).toISOString();

    const { error: stageError } = await supabase
      .from("games")
      .update({ stage: "reveal", voting_deadline: nextVotingDeadline })
      .eq("id", currentGameId);

    if (stageError) throw stageError;

    setStage("reveal");
    setVotingDeadline(nextVotingDeadline);
  } catch (error) {
    console.error("Failed to reveal submitted images:", error);
    alert("Could not reveal the submitted images.");
  } finally {
    setIsForcingStage(false);
  }
}

async function endVotingEarly() {
  if (!isHost || !currentGameId || isForcingStage) return;

  setIsForcingStage(true);

  try {
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("id")
      .eq("game_id", currentGameId);

    if (votesError) throw votesError;

    if (!votes?.length) {
      alert("At least one vote is needed to choose a winner.");
      return;
    }

    const { error: stageError } = await supabase
      .from("games")
      .update({ stage: "winner" })
      .eq("id", currentGameId);

    if (stageError) throw stageError;

    setStage("winner");
  } catch (error) {
    console.error("Failed to end voting:", error);
    alert("Could not end voting.");
  } finally {
    setIsForcingStage(false);
  }
}

async function loadWinner() {
  if (!currentGameId) return;

  const { data, error } = await supabase
    .from("votes")
    .select("voted_for")
    .eq("game_id", currentGameId);

  if (error) {
    console.error(error);
    return;
  }

  const voteCounts: Record<string, number> = {};

  data.forEach((vote) => {
    voteCounts[vote.voted_for] = (voteCounts[vote.voted_for] || 0) + 1;
  });

  let topVotes = 0;

  Object.values(voteCounts).forEach((count) => {
    if (count > topVotes) {
      topVotes = count;
    }
  });

  if (topVotes === 0) return;

  const tiedSubmissions = Object.keys(voteCounts).filter(
    (submission) => voteCounts[submission] === topVotes
  );

  const winningImages: string[] = [];
  const winningThumbnails: string[] = [];

  for (const winningSubmission of tiedSubmissions) {
    const playerName = winningSubmission.split(":")[0].trim();

    const promptText = winningSubmission
      .split(":")
      .slice(1)
      .join(":")
      .trim();

    const { data: submissionData, error: submissionError } = await supabase
      .from("submissions")
      .select("image_url, gallery_thumbnail_url")
      .eq("game_id", currentGameId)
      .eq("player_name", playerName)
      .eq("prompt", promptText)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error(submissionError);
    }

    if (submissionData?.image_url) {
      winningImages.push(submissionData.image_url);
      winningThumbnails.push(submissionData.gallery_thumbnail_url || "");
    }
  }

  setWinnerImages(winningImages);

  if (tiedSubmissions.length > 1) {
    const tiedNames = tiedSubmissions.map((submission) =>
      submission.split(":")[0].trim()
    );

    setWinnerName(`Tie: ${tiedNames.join(" and ")}`);

    const tiedPrompts = tiedSubmissions
      .map((submission) => submission.split(":").slice(1).join(":").trim())
      .join(" / ");

    setWinnerPrompt(tiedPrompts);

    setWinner(`Tie! ${tiedSubmissions.join(" and ")} each get 1 point.`);
  } else {
    const winningSubmission = tiedSubmissions[0];

    const displayWinnerName = winningSubmission.split(":")[0].trim();

    const displayWinnerPrompt = winningSubmission
      .split(":")
      .slice(1)
      .join(":")
      .trim();

    setWinnerName(displayWinnerName);
    setWinnerPrompt(displayWinnerPrompt);

    setWinner(
      `${displayWinnerName}: ${displayWinnerPrompt} (${topVotes} vote${
        topVotes === 1 ? "" : "s"
      })`
    );
  }

 const { data: gameData } = await supabase
  .from("games")
  .select("id, winner_awarded")
  .eq("id", currentGameId)
  .maybeSingle();

if (!gameData) return;

if (!gameData.winner_awarded) {
  const winnerNames = tiedSubmissions.map((submission) =>
    submission.split(":")[0].trim()
  );

  const { error: awardError } = await supabase.rpc("award_winners_once", {
    winner_names_input: winnerNames,
    room_code_input: code,
    game_id_input: gameData.id,
  });

  if (awardError) {
    console.error("Award error:", awardError);
    return;
  }

  const { data: latestHistory, error: historyError } = await supabase
    .from("round_history")
    .select("round_number")
    .eq("room_code", code)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyError) {
    console.error("Failed to load round history:", historyError);
    return;
  }

  const nextRoundNumber = (latestHistory?.round_number ?? 0) + 1;

  for (const winningSubmission of tiedSubmissions) {
    const playerName = winningSubmission.split(":")[0].trim();

    const promptText = winningSubmission
      .split(":")
      .slice(1)
      .join(":")
      .trim();

    const imageIndex = tiedSubmissions.indexOf(winningSubmission);

    await supabase.from("round_history").upsert(
      {
        room_code: code,
        game_id: gameData.id,
        round_number: nextRoundNumber,
        winner_name: playerName,
        winner_prompt: promptText,
        winner_image_url: winningImages[imageIndex] || null,
        gallery_thumbnail_url: winningThumbnails[imageIndex] || null,
      },
      {
        onConflict: "room_code,game_id,winner_name,winner_prompt",
      }
    );
  }
}

setPointsAwarded(true);

await loadPlayers();
await loadScoreboard();
await loadRoundHistory();
await loadPastImages();
}

async function nextRound() {
  if (!isHost || isAdvancing) return;

  setIsAdvancing(true);

  try {
    const newPrompt = await loadRandomPrompt();

    if (!newPrompt) {
      alert("Could not load the next prompt");
      return;
    }

    const activeImageStyle = resolveImageStyle(
      newPrompt.image_style,
      selectedImageStyle
    );
    const submissionDeadline =
      selectedRoundDuration === "unlimited"
        ? null
        : new Date(Date.now() + selectedRoundDuration * 1000).toISOString();

    const { data: newGame, error: gameError } = await supabase
      .from("games")
      .insert({
        room_code: code,
        stage: "submitting",
        prompt: newPrompt.prompt,
        prompt_id: newPrompt.id,
        prompt_source: newPrompt.source,
        game_mode: selectedGameMode,
        image_style: activeImageStyle,
        submission_deadline: submissionDeadline,
        voting_duration_seconds: selectedVotingDuration,
        winner_awarded: false,
      })
      .select("id")
      .single();

    if (gameError) throw gameError;

    setCurrentGameId(newGame.id);
    setRoundPrompt(newPrompt.prompt);
    setRoundImageStyle(activeImageStyle);
    setRoundDeadline(submissionDeadline);
    setVotingDeadline(null);
    setStage("submitting"); // Move this browser immediately.
    setHasVoted(false);
    setVoteMessage("");
    setSubmission("");
    setSubmissions([]);
    setWinner("");
    setPointsAwarded(false);
  } catch (error) {
    console.error("Failed to start next round:", error);
    alert("Could not start the next round. Check the browser console.");
  } finally {
    setIsAdvancing(false);
  }
}

async function playAgain() {
  if (!isHost || !currentGameId || isPlayingAgain) return;

  setIsPlayingAgain(true);

  try {
    const { error: scoreResetError } = await supabase
      .from("players")
      .update({ points: 0 })
      .eq("room_code", code);

    if (scoreResetError) throw scoreResetError;

    const { error: stageError } = await supabase
      .from("games")
      .update({ stage: "lobby" })
      .eq("id", currentGameId);

    if (stageError) throw stageError;

    setFinalWinner("");
    setWinner("");
    setWinnerName("");
    setWinnerPrompt("");
    setWinnerImages([]);
    setSubmissions([]);
    setRoundDeadline(null);
    setVotingDeadline(null);
    setStage("lobby");
    await loadPlayers();
    await loadScoreboard();
  } catch (error) {
    console.error("Failed to start a rematch:", error);
    alert("Could not start a rematch.");
  } finally {
    setIsPlayingAgain(false);
  }
}


async function saveImage(imageUrl: string, answerText: string) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${answerText.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Could not save image");
  }
}


async function loadScoreboard() {
  const { data, error } = await supabase
    .from("players")
    .select("name, points,avatar_url")
    .eq("room_code", code)
    .order("points", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const sortedPlayers = [...data].sort(
  (a, b) => (b.points ?? 0) - (a.points ?? 0)
);

setScoreboardPlayers(sortedPlayers);

  const leader = data[0];

  if (leader && leader.points >= 3) {
    setFinalWinner(`${leader.name} wins the game with ${leader.points} points!`);
  }
}
if (isJoining) {
  return (
    <LoadingScreen title="Joining Room..." message="Gathering the troublemakers" />
  );
}

if (isPageLoading) {
  return (
    <LoadingScreen title="Loading Game..." message="Getting the chaos ready" />
  );
}


  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <GameLogo />

      {!joined ? (
  <JoinRoomForm
    name={name}
    isJoining={isJoining}
    onNameChange={setName}
    onAvatarFileChange={setAvatarFile}
    onJoinGame={joinGame}
  />
) : stage === "lobby" ? (
  <LobbyScreen
    code={code}
    players={players}
    maxPlayers={MAX_PLAYERS}
    playerName={name}
    isHost={isHost}
    hostName={hostName}
    selectedGameMode={selectedGameMode}
    selectedCategory={selectedCategory}
    selectedImageStyle={selectedImageStyle}
    selectedRoundDuration={selectedRoundDuration}
    selectedVotingDuration={selectedVotingDuration}
    isStarting={isStarting}
    isRoundCustomizationOpen={isRoundCustomizationOpen}
    roomShareMessage={roomShareMessage}
    promptSuggestions={promptSuggestions}
    promptSuggestionText={promptSuggestionText}
    promptSuggestionMode={promptSuggestionMode}
    promptApprovalVotesNeeded={promptApprovalVotesNeeded}
    isSubmittingPromptSuggestion={isSubmittingPromptSuggestion}
    onGameModeChange={setSelectedGameMode}
    onCategoryChange={setSelectedCategory}
    onImageStyleChange={setSelectedImageStyle}
    onRoundDurationChange={setSelectedRoundDuration}
    onVotingDurationChange={setSelectedVotingDuration}
    onToggleRoundCustomization={() => setIsRoundCustomizationOpen((open) => !open)}
    onStartGame={startGame}
    onCopyRoomCode={copyRoomCode}
    onShareRoom={shareRoom}
    onPromptSuggestionTextChange={setPromptSuggestionText}
    onPromptSuggestionModeChange={setPromptSuggestionMode}
    onSubmitPromptSuggestion={submitPromptSuggestion}
    onVotePromptSuggestion={voteForPromptSuggestion}
  />
) : stage === "submitting" ? (
  <>
    {showRoundIntro && (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-purple-700 p-6 text-center text-white">
        <p className="text-sm font-extrabold uppercase tracking-wider text-purple-200">Get ready</p>
        <h2 className="mt-2 text-6xl font-black">Round {currentRoundNumber}</h2>
        <p className="mt-3 text-xl font-bold">
          {selectedGameMode === "cards" ? "Fill in the blank." : "Write the funniest answer."}
        </p>
      </div>
    )}
    <RoundPromptCard
      gameMode={selectedGameMode}
      prompt={roundPrompt}
      imageStyle={roundImageStyle}
      timeRemainingSeconds={timeRemainingSeconds}
      expiredMessage="Time's up — waiting for the host"
      activeTimerLabel="Time remaining"
      formatCountdown={formatCountdown}
      getImageStyleLabel={getImageStyleLabel}
    />

    {hasSubmitted || isSubmitting ? (
      <GeneratingScreen
        players={players}
        submissions={submissions}
        loadingMessage={loadingMessage}
        currentGalleryImage={currentGalleryImage}
        hasCurrentRoundImage={hasCurrentRoundImage}
        isGalleryImageVisible={isGalleryImageVisible}
        isHost={isHost}
        isForcingStage={isForcingStage}
        onForceReveal={forceReveal}
      />
    ) : (
  <SubmissionForm
    gameMode={selectedGameMode}
    submission={submission}
    isSubmitting={isSubmitting}
    isSubmissionTimeExpired={isSubmissionTimeExpired}
    isHost={isHost}
    submissionsCount={submissions.length}
    isForcingStage={isForcingStage}
    isAdvancing={isAdvancing}
    onSubmissionChange={setSubmission}
    onSubmit={submitPrompt}
    onForceReveal={forceReveal}
    onSkipRound={nextRound}
  />
)}
  </>
      ) : stage === "generating" ? (
  <div className="min-h-screen w-full bg-purple-700 flex flex-col items-center justify-center text-white">
    <div className="text-8xl mb-6 animate-bounce">🎨</div>

    <h2 className="text-4xl font-bold mb-4">
      Creating Chaos...
    </h2>

    <p className="text-xl text-center max-w-md">
      The AI is cooking up something ridiculous.
    </p>

    <div className="mt-8 animate-pulse text-lg">
      Generating masterpiece...
    </div>
  </div>
   ) : stage === "reveal" ? (
    <VotingScreen
      gameMode={selectedGameMode}
      roundPrompt={roundPrompt}
      roundImageStyle={roundImageStyle}
      votingTimeRemainingSeconds={votingTimeRemainingSeconds}
      isVotingTimeExpired={isVotingTimeExpired}
      voteMessage={voteMessage}
      isHost={isHost}
      isForcingStage={isForcingStage}
      hasVoted={hasVoted}
      allowSelfVoting={players.length === 2}
      playerName={name}
      submissions={submissions}
      onEndVotingEarly={endVotingEarly}
      onVote={voteForSubmission}
      onSaveImage={saveImage}
      formatCountdown={formatCountdown}
      getImageStyleLabel={getImageStyleLabel}
    />
/* =======================================
   WINNER SCREEN
======================================= */
) : stage === "winner" ? (
  <WinnerScreen
    confettiPieces={confettiPieces}
    winnerImages={winnerImages}
    winnerName={winnerName}
    winnerPrompt={winnerPrompt}
    winner={winner}
    scoreboardPlayers={scoreboardPlayers}
    finalWinner={finalWinner}
    roundHistory={roundHistory}
    isHost={isHost}
    hostName={hostName}
    isPlayingAgain={isPlayingAgain}
    isAdvancing={isAdvancing}
    onPlayAgain={playAgain}
    onNextRound={nextRound}
  />
) : (
  <p>Unknown game stage.</p>
)}
</main>
  );
}

