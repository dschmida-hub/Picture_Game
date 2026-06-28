"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GeneratingScreen } from "./components/GeneratingScreen";
import { GameLogo } from "./components/GameLogo";
import { HostDebugPanel } from "./components/HostDebugPanel";
import { JoinRoomForm } from "./components/JoinRoomForm";
import { LobbyScreen } from "./components/LobbyScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { RoundPromptCard } from "./components/RoundPromptCard";
import { SubmissionForm } from "./components/SubmissionForm";
import { ToastNotice, type ToastTone } from "./components/ToastNotice";
import { VotingScreen } from "./components/VotingScreen";
import { WinnerScreen } from "./components/WinnerScreen";
import { useRoundCountdowns } from "./hooks/useRoundCountdowns";
import { useRoundReadiness } from "./hooks/useRoundReadiness";
import { useRotatingPastImages } from "./hooks/useRotatingPastImages";
import { ratePrompt } from "./components/promptQuality";
import { gameApi } from "./utils/clientApi";
import type {
  GameMode,
  Player,
  PromptRating,
  PromptSuggestion,
  RoundHistoryItem,
  ScoreboardPlayer,
} from "./components/types";
import {
  arePlayerNamesEqual,
  confettiPieces,
  formatCountdown,
  formatRoomExpiration,
  getImageStyleLabel,
  getPromptRatingTable,
  MAX_PLAYERS,
  normalizePlayerName,
  pickBestRatedPromptDeck,
  resolveImageStyle,
  type PromptOption,
  type PromptSource,
} from "./utils/gameRoomUtils";

type GameStage = "lobby" | "submitting" | "generating" | "reveal" | "winner";

type ToastState = {
  message: string;
  tone: ToastTone;
};

type HostDebugStats = {
  estimatedCostCents: number;
  generatedImages: number;
  imageModel: string | null;
  imageProvider: string | null;
  reportCount: number | null;
};

const emptyHostDebugStats: HostDebugStats = {
  estimatedCostCents: 0,
  generatedImages: 0,
  imageModel: null,
  imageProvider: null,
  reportCount: null,
};

const PROMPT_SKIP_THRESHOLD = 0.75;

export default function GameRoom() {
  const params = useParams();
  const code = params.code as string;
  const playerStorageKey = `picture-this:${code}:player-id`;

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<GameStage>("lobby");
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [currentPromptId, setCurrentPromptId] = useState<number | null>(null);
  const [currentPromptSource, setCurrentPromptSource] = useState<PromptSource | null>(null);
  const [currentPromptRating, setCurrentPromptRating] = useState<PromptRating | null>(null);
  const [ratedPromptKey, setRatedPromptKey] = useState<string | null>(null);
  const [isRatingCurrentPrompt, setIsRatingCurrentPrompt] = useState(false);
  const [promptSkipVoteCount, setPromptSkipVoteCount] = useState(0);
  const [hasVotedToSkipPrompt, setHasVotedToSkipPrompt] = useState(false);
  const [isVotingToSkipPrompt, setIsVotingToSkipPrompt] = useState(false);
  const [submission, setSubmission] = useState("");
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [winner, setWinner] = useState("");
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
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);
  const [isForcingStage, setIsForcingStage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [roomShareMessage, setRoomShareMessage] = useState("");
  const [roomCreatedAt, setRoomCreatedAt] = useState<string | null>(null);
  const [reconnectMessage, setReconnectMessage] = useState("");
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([]);
  const [promptSuggestionText, setPromptSuggestionText] = useState("");
  const [isSubmittingPromptSuggestion, setIsSubmittingPromptSuggestion] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedPlayerNames, setVotedPlayerNames] = useState<string[]>([]);
  const [voteMessage, setVoteMessage] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [winnerPrompt, setWinnerPrompt] = useState("");
  const [winnerImages, setWinnerImages] = useState<string[]>([]);
  const [roundPrompt, setRoundPrompt] = useState("");
  const [roundImageStyle, setRoundImageStyle] = useState("cartoon");
  const [hostDebugStats, setHostDebugStats] = useState<HostDebugStats>(emptyHostDebugStats);
  const [toast, setToast] = useState<ToastState | null>(null);
  const hostName = players.find((player) => player.is_host)?.name;
  const isHost = joined && name === hostName;
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [pastImages, setPastImages] = useState<string[]>([]);
  const {
    hasCurrentRoundImage,
    hasSubmitted,
    waitingOnImageNames,
    waitingOnSubmissionNames,
    waitingOnVoteNames,
  } = useRoundReadiness({
    currentPlayerName: name,
    players,
    submissions,
    votedPlayerNames,
  });
  const { currentGalleryImage, isGalleryImageVisible } = useRotatingPastImages({
    hasCurrentRoundImage,
    isSubmitting,
    pastImages,
  });
  const currentPromptKey = currentPromptId && currentPromptSource ? `${currentPromptSource}:${currentPromptId}` : null;
  const hasRatedCurrentPrompt = Boolean(currentPromptKey && ratedPromptKey === currentPromptKey);
  const {
    isSubmissionTimeExpired,
    isVotingTimeExpired,
    timeRemainingSeconds,
    votingTimeRemainingSeconds,
  } = useRoundCountdowns({
    roundDeadline,
    stage,
    votingDeadline,
  });
  const currentRoundNumber = roundHistory.reduce(
    (highestRound, round) => Math.max(highestRound, round.round_number || 0),
    0
  ) + 1;
  const promptSkipVotesNeeded = Math.max(1, Math.ceil(players.length * PROMPT_SKIP_THRESHOLD));
  const promptApprovalVotesNeeded = Math.max(2, Math.ceil(players.length / 2));
  const promptSuggestionRating = ratePrompt(promptSuggestionText, selectedGameMode);
  const roomExpirationMessage = formatRoomExpiration(roomCreatedAt);

  function showToast(message: string, tone: ToastTone = "error") {
    setToast({ message, tone });
  }

  const toastNotice = (
    <ToastNotice
      message={toast?.message || ""}
      tone={toast?.tone || "info"}
      onDismiss={() => setToast(null)}
    />
  );

  useEffect(() => {
    if (stage !== "submitting" || !currentGameId) return;

    const introTimeout = window.setTimeout(() => setShowRoundIntro(true), 0);
    const hideTimeout = window.setTimeout(() => setShowRoundIntro(false), 1400);

    return () => {
      window.clearTimeout(introTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [currentGameId, stage]);

  useEffect(() => {
    if (!reconnectMessage) return;

    const timeout = window.setTimeout(() => setReconnectMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [reconnectMessage]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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

async function pickRoundPrompt(): Promise<PromptOption | null> {
  let promptQuery;
  const basePromptSource: PromptSource = selectedGameMode;
  const customPromptSource: PromptSource = `custom_${selectedGameMode}`;

  if (selectedGameMode === "cards") {
    promptQuery = supabase
      .from("cah_prompts")
      .select("id, prompt, image_style, prompt_rating")
      .eq("active", true);
  } else {
    promptQuery = supabase
      .from("prompts")
      .select("id, prompt, image_style, prompt_rating")
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

  const basePrompts = ((data || []) as Array<{
    id: number;
    prompt: string;
    image_style: string | null;
    prompt_rating: PromptRating | null;
  }>).map(
    (prompt) => ({
      ...prompt,
      source: basePromptSource,
      rating: prompt.prompt_rating || ratePrompt(prompt.prompt, selectedGameMode),
    })
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
      rating: suggestion.rating,
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
  const unusedCustomPrompts = approvedSuggestions.filter(
    (prompt) => !usedPromptKeys.has(`${prompt.source}:${prompt.id}`)
  );
  const promptDeck = pickBestRatedPromptDeck(
    unusedCustomPrompts.length > 0
      ? unusedCustomPrompts
      : unusedPrompts.length > 0
        ? unusedPrompts
        : allPrompts
  );

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
    .select("id, name, points, avatar_url, avatar_description, is_host")
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

async function removePlayer(player: Player) {
  if (!isHost || player.is_host) return;
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  const shouldRemove = window.confirm(
    `Remove ${player.name} from this room? Their submissions and votes in this room will also be removed.`
  );

  if (!shouldRemove) return;

  try {
    const { error } = await supabase.rpc("remove_player_from_room", {
      host_player_id_input: Number(savedPlayerId),
      player_id_input: player.id,
      room_code_input: code,
    });

    if (error) throw error;

    await Promise.all([
      loadPlayers(),
      loadSubmissions(),
      loadVotes(),
      loadScoreboard(),
    ]);
  } catch (error) {
    console.error("Failed to remove player:", error);
    showToast("Could not remove that player.");
  }
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
      rating: ratePrompt(suggestion.prompt, suggestion.game_mode as GameMode),
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
    const { error } = await supabase.rpc("submit_room_prompt_suggestion", {
      game_mode_input: selectedGameMode,
      image_style_input: selectedImageStyle === "prompt" ? "cartoon" : selectedImageStyle,
      prompt_input: prompt,
      room_code_input: code,
      submitted_by_input: name,
    });

    if (error) throw error;

    setPromptSuggestionText("");
    await loadPromptSuggestions();
  } catch (error) {
    console.error("Failed to submit prompt suggestion:", error);
    const message = error instanceof Error ? error.message : "Unknown Supabase error";
    showToast(`Could not submit that prompt suggestion: ${message}`);
  } finally {
    setIsSubmittingPromptSuggestion(false);
  }
}

async function voteForPromptSuggestion(suggestionId: number) {
  if (!joined || !name) return;

  const { error } = await supabase.rpc("vote_for_room_prompt_suggestion", {
    room_code_input: code,
    suggestion_id_input: suggestionId,
    voter_name_input: name,
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
    .select("id, player_name, prompt, image_url, gallery_thumbnail_url, image_caption")
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
      `${item.id}|||${item.prompt}|||${item.image_url || ""}|||${item.player_name}|||${
        item.image_caption || "Untitled Masterpiece"
      }|||${item.gallery_thumbnail_url || ""}`
    )
  );
}

async function loadHostDebugStats(gameId = currentGameId) {
  if (!gameId) {
    setHostDebugStats(emptyHostDebugStats);
    return;
  }

  const { data: submissionStats, error: submissionStatsError } = await supabase
    .from("submissions")
    .select("estimated_image_cost_cents, image_model, image_provider, image_url")
    .eq("game_id", gameId)
    .not("image_url", "is", null);

  if (submissionStatsError) {
    console.error("Failed to load host debug submission stats:", submissionStatsError);
    return;
  }

  const generatedSubmissions = submissionStats || [];
  const latestGeneratedSubmission = generatedSubmissions[generatedSubmissions.length - 1];
  const estimatedCostCents = generatedSubmissions.reduce(
    (sum, item) => sum + Number(item.estimated_image_cost_cents || 0),
    0
  );

  const { count: reportCount, error: reportCountError } = await supabase
    .from("image_reports")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  if (reportCountError) {
    console.error("Failed to load host debug report count:", reportCountError);
  }

  setHostDebugStats({
    estimatedCostCents,
    generatedImages: generatedSubmissions.length,
    imageModel: latestGeneratedSubmission?.image_model || null,
    imageProvider: latestGeneratedSubmission?.image_provider || null,
    reportCount: reportCountError ? null : reportCount || 0,
  });
}

async function loadVotes(gameId = currentGameId) {
  if (!gameId) {
    setVotedPlayerNames([]);
    return;
  }

  const { data, error } = await supabase
    .from("votes")
    .select("voter_name")
    .eq("game_id", gameId);

  if (error) {
    console.error("Failed to load votes:", error);
    return;
  }

  setVotedPlayerNames(Array.from(new Set((data || []).map((vote) => vote.voter_name))));
}

async function loadPromptSkipVotes(gameId = currentGameId) {
  if (!gameId) {
    setPromptSkipVoteCount(0);
    setHasVotedToSkipPrompt(false);
    return;
  }

  const { data, error } = await supabase
    .from("prompt_skip_votes")
    .select("voter_name")
    .eq("room_code", code)
    .eq("game_id", gameId);

  if (error) {
    console.error("Failed to load prompt skip votes:", error);
    return;
  }

  const voterNames = Array.from(new Set((data || []).map((vote) => vote.voter_name)));

  setPromptSkipVoteCount(voterNames.length);
  setHasVotedToSkipPrompt(Boolean(name && voterNames.some((voterName) => arePlayerNamesEqual(voterName, name))));
}

async function loadCurrentPromptRating(
  promptId: number | null,
  promptSource: PromptSource | null,
  promptText: string,
  gameMode: GameMode
) {
  const tableName = getPromptRatingTable(promptSource);

  if (!promptId || !tableName) {
    setCurrentPromptRating(null);
    return;
  }

  const { data, error } = await supabase
    .from(tableName)
    .select("prompt_rating")
    .eq("id", promptId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load current prompt rating:", error);
    setCurrentPromptRating(ratePrompt(promptText, gameMode));
    return;
  }

  setCurrentPromptRating(data?.prompt_rating || ratePrompt(promptText, gameMode));
}

async function rateCurrentPrompt(rating: PromptRating) {
  const tableName = getPromptRatingTable(currentPromptSource);

  if (!currentPromptId || !tableName || isRatingCurrentPrompt) return;

  setIsRatingCurrentPrompt(true);

  try {
    const { error } = await supabase
      .from(tableName)
      .update({ prompt_rating: rating })
      .eq("id", currentPromptId);

    if (error) throw error;

    setCurrentPromptRating(rating);
    setRatedPromptKey(`${currentPromptSource}:${currentPromptId}`);
    showToast(`Prompt marked ${rating}.`, "success");
  } catch (error) {
    console.error("Failed to rate current prompt:", error);
    showToast("Could not save that prompt rating.");
  } finally {
    setIsRatingCurrentPrompt(false);
  }
}

async function voteToSkipPrompt() {
  if (!joined || !currentGameId || hasVotedToSkipPrompt || isVotingToSkipPrompt) return;

  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your player session was lost. Please rejoin the room.");
    return;
  }

  setIsVotingToSkipPrompt(true);

  try {
    const { data, error } = await supabase.rpc("vote_to_skip_round_prompt", {
      game_id_input: currentGameId,
      player_id_input: Number(savedPlayerId),
      room_code_input: code,
      threshold_ratio_input: PROMPT_SKIP_THRESHOLD,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    setHasVotedToSkipPrompt(true);
    setPromptSkipVoteCount(result?.skip_count ?? promptSkipVoteCount + 1);

    if (result?.skipped) {
      setCurrentPromptRating("bad");
      const replacementPrompt = await pickRoundPrompt();

      if (!replacementPrompt) {
        showToast("That prompt was marked bad, but I couldn't find another prompt to replace it yet.");
        await loadGame();
        return;
      }

      const replacementRound = await replaceSkippedRoundWithPrompt(currentGameId, savedPlayerId, replacementPrompt);

      if (!replacementRound) {
        await loadGame();
        return;
      }

      setCurrentGameId(replacementRound.gameId);
      setCurrentPromptId(replacementPrompt.id);
      setCurrentPromptSource(replacementPrompt.source);
      setCurrentPromptRating(replacementPrompt.rating);
      setRoundPrompt(replacementPrompt.prompt);
      setRoundImageStyle(replacementRound.activeImageStyle);
      setRoundDeadline(replacementRound.submissionDeadline);
      setVotingDeadline(null);
      setPromptSkipVoteCount(0);
      setHasVotedToSkipPrompt(false);
      setSubmission("");
      setSubmissions([]);
      setVotedPlayerNames([]);
      setStage("submitting");
      showToast("Prompt skipped. A fresh prompt is up.", "success");
      return;
    }

    await loadPromptSkipVotes(currentGameId);
  } catch (error) {
    console.error("Failed to vote to skip prompt:", error);
    showToast(`Could not vote to skip: ${error instanceof Error ? error.message : "Unknown database error"}`);
  } finally {
    setIsVotingToSkipPrompt(false);
  }
}

async function replaceSkippedRoundWithPrompt(
  skippedGameId: number,
  playerId: string,
  prompt: PromptOption
) {
  const activeImageStyle = resolveImageStyle(prompt.image_style, selectedImageStyle);
  const submissionDeadline =
    selectedRoundDuration === "unlimited"
      ? null
      : new Date(Date.now() + selectedRoundDuration * 1000).toISOString();

  const { data: newGameId, error } = await supabase.rpc("replace_skipped_round_prompt", {
    game_mode_input: selectedGameMode,
    image_style_input: activeImageStyle,
    player_id_input: Number(playerId),
    prompt_id_input: prompt.id,
    prompt_input: prompt.prompt,
    prompt_source_input: prompt.source,
    room_code_input: code,
    skipped_game_id_input: skippedGameId,
    submission_deadline_input: submissionDeadline,
    threshold_ratio_input: PROMPT_SKIP_THRESHOLD,
    voting_duration_seconds_input: selectedVotingDuration,
  });

  if (error) {
    console.error("Failed to replace skipped prompt:", error);
    showToast(`The prompt was skipped, but the replacement failed: ${error.message || "Unknown database error"}`);
    return null;
  }

  return {
    activeImageStyle,
    gameId: Number(newGameId),
    submissionDeadline,
  };
}

async function loadGame() {
  
  const { data, error } = await supabase
    .from("games")
    .select("id, created_at, stage, prompt, prompt_id, prompt_source, game_mode, image_style, submission_deadline, voting_deadline, voting_duration_seconds")
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
  setRoomCreatedAt(data.created_at || null);
  setCurrentPromptId(data.prompt_id);
  setCurrentPromptSource(data.prompt_source as PromptSource | null);
  setStage(data.stage as GameStage);
  setRoundPrompt(data.prompt);
  setSelectedGameMode(data.game_mode as "classic" | "cards");
  setRoundImageStyle(data.image_style || "cartoon");
  setRoundDeadline(data.submission_deadline);
  setVotingDeadline(data.voting_deadline);
  setSelectedVotingDuration(data.voting_duration_seconds || 45);
  await loadCurrentPromptRating(data.prompt_id, data.prompt_source as PromptSource | null, data.prompt, data.game_mode as GameMode);
  await loadSubmissions(data.id);
  await loadVotes(data.id);
  await loadPromptSkipVotes(data.id);
  await loadHostDebugStats(data.id);
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
  setReconnectMessage(`Welcome back, ${data.name}!`);
}

useEffect(() => {
  if (stage !== "winner") return;

  const timeout = window.setTimeout(() => {
    void loadWinner();
    void loadRoundHistory();
  }, 0);

  return () => window.clearTimeout(timeout);
}, [stage]);

useEffect(() => {
  if (stage !== "submitting") return;

  const timeout = window.setTimeout(() => {
    setHasVoted(false);
    setVotedPlayerNames([]);
    setVoteMessage("");
    setSubmission("");
    setWinner("");
    setVotedPlayerNames([]);
  }, 0);

  return () => window.clearTimeout(timeout);
}, [stage]);

useEffect(() => {
  let isMounted = true;

  async function loadInitialData() {
    setIsPageLoading(true);

    try {
      const initialLoad = Promise.allSettled([
        loadPlayers(),
        loadGame(),
        loadSubmissions(),
        loadVotes(),
        loadScoreboard(),
        loadPastImages(),
        loadRoundHistory(),
        loadPromptSuggestions(),
      ]);

      const timeout = new Promise<"timeout">((resolve) => {
        window.setTimeout(() => resolve("timeout"), 8000);
      });

      const result = await Promise.race([initialLoad, timeout]);

      if (result === "timeout") {
        console.warn("Initial room load timed out. Showing the room anyway.");
      } else {
        result.forEach((item) => {
          if (item.status === "rejected") {
            console.error("Initial room load task failed:", item.reason);
          }
        });
      }

      await restoreJoinedPlayer();
    } catch (error) {
      console.error("Initial room load failed:", error);
    } finally {
      if (isMounted) {
        setIsPageLoading(false);
      }
    }
  }

  loadInitialData();

  const interval = setInterval(() => {
  loadPlayers();
  loadGame();
  loadVotes();
  loadScoreboard();
  loadPromptSuggestions();
}, 2000);
  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, []);

async function joinGame() {
  
  if (!name.trim()) return;
  
  if (isJoining) return;

  setIsJoining(true);

  try {

  const cleanName = normalizePlayerName(name);
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (savedPlayerId) {
    const { data: savedPlayer, error: savedPlayerError } = await supabase
      .from("players")
      .select("id, name")
      .eq("id", savedPlayerId)
      .eq("room_code", code)
      .maybeSingle();

    if (savedPlayerError) {
      console.error(savedPlayerError);
      showToast("Failed to check your saved player.");
      return;
    }

    if (savedPlayer && arePlayerNamesEqual(savedPlayer.name, cleanName)) {
      setName(savedPlayer.name);
      await loadPlayers();
      setJoined(true);
      setReconnectMessage(`Welcome back, ${savedPlayer.name}!`);
      return;
    }
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
      showToast("Failed to upload avatar");
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    avatarUrl = data.publicUrl;

    try {
      const { data: descData } = await gameApi.describeAvatar(avatarUrl);
      avatarDescription = descData?.description || null;
    } catch (error) {
      console.error("Avatar description failed:", error);
    }
  }

    const cameFromCreateGame = new URLSearchParams(window.location.search).get("create") === "1";

    const { data: joinData, error: joinError } = await gameApi.joinRoom({
      allowCreateRoom: cameFromCreateGame,
      avatarDescription,
      avatarUrl,
      name: cleanName,
      roomCode: code,
    });

    if (joinError || !joinData) {
      console.error(joinError);
      showToast(joinError || "Failed to join room");
      return;
    }

    setName(joinData.playerName || cleanName);
    window.localStorage.setItem(playerStorageKey, String(joinData.playerId));

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

async function createRoundFromPrompt(prompt: PromptOption) {
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return null;
  }

  const activeImageStyle = resolveImageStyle(prompt.image_style, selectedImageStyle);
  const submissionDeadline =
    selectedRoundDuration === "unlimited"
      ? null
      : new Date(Date.now() + selectedRoundDuration * 1000).toISOString();

  const { data: newGameId, error } = await supabase.rpc("create_game_round", {
    game_mode_input: selectedGameMode,
    host_player_id_input: Number(savedPlayerId),
    image_style_input: activeImageStyle,
    prompt_id_input: prompt.id,
    prompt_input: prompt.prompt,
    prompt_source_input: prompt.source,
    room_code_input: code,
    submission_deadline_input: submissionDeadline,
    voting_duration_seconds_input: selectedVotingDuration,
  });

  if (error) {
    console.error(error);
    showToast(`Failed to start round: ${error.message || "Unknown database error"}`);
    return null;
  }

  return {
    activeImageStyle,
    gameId: Number(newGameId),
    submissionDeadline,
  };
}

async function startGame() {
  if (!isHost || isStarting) return;
  if (players.length < 2) {
    showToast("Wait for at least one more player before starting.");
    return;
  }

  setIsStarting(true);

  try {
    const randomPrompt = await pickRoundPrompt();

    if (!randomPrompt) {
    showToast(
      selectedGameMode === "cards"
      ? "No fill-in-the-blank prompts found"
      : "No prompts found for this category"
    );
  return;
  }

    console.log("Selected CAH prompt:", randomPrompt.prompt);

    const newRound = await createRoundFromPrompt(randomPrompt);
    if (!newRound) return;

    setCurrentGameId(newRound.gameId);
    setCurrentPromptId(randomPrompt.id);
    setCurrentPromptSource(randomPrompt.source);
    setCurrentPromptRating(randomPrompt.rating);
    setRoundPrompt(randomPrompt.prompt);
    setRoundImageStyle(newRound.activeImageStyle);
    setRoundDeadline(newRound.submissionDeadline);
    setVotingDeadline(null);
    setPromptSkipVoteCount(0);
    setHasVotedToSkipPrompt(false);
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
    showToast("Time is up for this round.");
    return;
  }
  if (!currentGameId) {
    showToast("The round is still loading. Please try again.");
    return;
  }
  const submittedAnswer = submission.trim();
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your player session was lost. Please rejoin the room.");
    return;
  }

  setIsSubmitting(true);

  try {
    const { data: submitData, error: submitError } = await gameApi.submitAnswer({
      answer: submittedAnswer,
      gameId: currentGameId,
      playerId: savedPlayerId,
      roomCode: code,
    });

    if (submitError || !submitData) {
      console.error(submitError);
      showToast(submitError || "Failed to submit answer");
      return;
    }

    const pendingSubmissionId = submitData.submissionId;

    await loadSubmissions(currentGameId);

    setLoadingMessage(
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
    );

    const { data: imageData, error: imageError } = await gameApi.generateImage({
      roomCode: code,
      gameId: currentGameId,
      playerId: savedPlayerId,
      submissionId: pendingSubmissionId,
    });

    if (imageError) {
      console.error(imageData || imageError);
      if (imageData?.rejected) {
        const wasExtended = await grantImageRetryTime();
        showToast(
          wasExtended
            ? "The AI got weird about that one. You have an extra minute to tweak your answer and try again."
            : "The AI got weird about that one. Try a slightly different version."
        );
      } else {
        showToast("The image machine tripped over its own shoelaces. Try submitting again.");
      }
      await gameApi.deletePendingSubmission({
        gameId: currentGameId,
        playerId: savedPlayerId,
        roomCode: code,
        submissionId: pendingSubmissionId,
      });
      await loadSubmissions(currentGameId);
      return;
    }

    setSubmission("");
    await loadSubmissions(currentGameId);
    await loadHostDebugStats(currentGameId);

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
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);
  const allowSelfVoting = players.length === 2;

  if (!savedPlayerId) {
    showToast("Your player session was lost. Please rejoin the room.");
    return;
  }

  if (playerName === name && !allowSelfVoting) {
    showToast("You can't vote for your own submission.");
    return;
  }
  if (isVotingTimeExpired) {
    showToast("Voting time is up.");
    return;
  }

  setHasVoted(true);

  const { data: voteData, error: voteError } = await gameApi.vote({
    answerText,
    gameId: currentGameId,
    playerId: savedPlayerId,
    roomCode: code,
    votedForPlayerName: playerName,
  });

  if (voteError || !voteData) {
    console.error(voteError);
    showToast(voteError || "Failed to vote");
    setHasVoted(false);
    return;
  }

  setVoteMessage("? Vote recorded! Waiting for other players...");
  await loadVotes(currentGameId);

  if (voteData.stage === "winner") {
    setStage("winner");
    await loadGame();
  }

}

async function rateImage(submissionId: number, rating: "funny" | "meh" | "bad") {
  if (!currentGameId) return;

  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your player session was lost. Please rejoin the room.");
    return;
  }

  try {
    const { error } = await gameApi.rateImage({
      gameId: currentGameId,
      playerId: savedPlayerId,
      rating,
      roomCode: code,
      submissionId,
    });

    if (error) {
      console.error(error);
      showToast("Could not save that image rating.");
      return;
    }

    setVoteMessage("Image feedback saved. Thanks!");
    showToast("Image feedback saved.", "success");
  } catch (error) {
    console.error("Failed to rate image:", error);
    showToast("Could not save that image rating.");
  }
}

async function reportImage(submissionId: number) {
  if (!currentGameId) return;

  const shouldReport = window.confirm(
    "Report this image/prompt for review? Use this for gross, unsafe, or game-ruining content."
  );

  if (!shouldReport) return;

  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your player session was lost. Please rejoin the room.");
    return;
  }

  try {
    const { error } = await gameApi.reportImage({
      gameId: currentGameId,
      playerId: savedPlayerId,
      roomCode: code,
      submissionId,
    });

    if (error) {
      console.error(error);
      showToast("Could not report that image.");
      return;
    }

    setVoteMessage("Report saved. Thanks for keeping the game playable.");
    showToast("Report saved for review.", "success");
    await loadHostDebugStats(currentGameId);
  } catch (error) {
    console.error("Failed to report image:", error);
    showToast("Could not report that image.");
  }
}

async function regenerateImage(submissionId: number, submissionPlayerName: string) {
  if (!isHost || !currentGameId || isForcingStage) return;

  const shouldRegenerate = window.confirm(
    `Regenerate ${submissionPlayerName}'s image? This uses another image generation.`
  );

  if (!shouldRegenerate) return;

  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  setIsForcingStage(true);

  try {
    const { data, error } = await gameApi.regenerateImage({
      gameId: currentGameId,
      playerId: savedPlayerId,
      roomCode: code,
      submissionId,
    });

    if (error) {
      console.error(data || error);
      showToast(error || "Could not regenerate that image.");
      return;
    }

    await Promise.all([
      loadSubmissions(currentGameId),
      loadHostDebugStats(currentGameId),
    ]);
    setVoteMessage("Image regenerated.");
    showToast("Image regenerated.", "success");
  } catch (error) {
    console.error("Failed to regenerate image:", error);
    showToast("Could not regenerate that image.");
  } finally {
    setIsForcingStage(false);
  }
}

async function deleteSubmission(submissionId: number, submissionPlayerName: string) {
  if (!isHost || !currentGameId || isForcingStage) return;
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  const shouldDelete = window.confirm(
    `Delete ${submissionPlayerName}'s submission from this round? Existing votes for it will be removed.`
  );

  if (!shouldDelete) return;

  setIsForcingStage(true);

  try {
    const { error } = await supabase.rpc("delete_round_submission", {
      game_id_input: currentGameId,
      host_player_id_input: Number(savedPlayerId),
      room_code_input: code,
      submission_id_input: submissionId,
    });

    if (error) throw error;

    await Promise.all([
      loadSubmissions(currentGameId),
      loadVotes(currentGameId),
      loadHostDebugStats(currentGameId),
    ]);
  } catch (error) {
    console.error("Failed to delete submission:", error);
    showToast(`Could not delete that submission: ${error instanceof Error ? error.message : "Unknown database error"}`);
  } finally {
    setIsForcingStage(false);
  }
}

async function forceReveal() {
  if (!isHost || !currentGameId || isForcingStage) return;
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  setIsForcingStage(true);

  try {
    const nextVotingDeadline = new Date(
      Date.now() + selectedVotingDuration * 1000
    ).toISOString();

    const { error } = await supabase.rpc("force_reveal_round", {
      game_id_input: currentGameId,
      host_player_id_input: Number(savedPlayerId),
      room_code_input: code,
      voting_deadline_input: nextVotingDeadline,
    });

    if (error) throw error;

    setStage("reveal");
    setVotingDeadline(nextVotingDeadline);
    await loadSubmissions(currentGameId);
    await loadHostDebugStats(currentGameId);
  } catch (error) {
    console.error("Failed to reveal submitted images:", error);
    showToast(`Could not reveal the submitted images: ${error instanceof Error ? error.message : "Unknown database error"}`);
  } finally {
    setIsForcingStage(false);
  }
}

async function returnToLobby() {
  if (!isHost || !currentGameId || isForcingStage) return;
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  const shouldReturn = window.confirm(
    "Return everyone to the lobby? Scores stay the same, but the current round will stop."
  );

  if (!shouldReturn) return;

  setIsForcingStage(true);

  try {
    const { error } = await supabase.rpc("return_round_to_lobby", {
      game_id_input: currentGameId,
      host_player_id_input: Number(savedPlayerId),
      room_code_input: code,
    });

    if (error) throw error;

    setStage("lobby");
    setSubmission("");
    setSubmissions([]);
    setWinner("");
    setWinnerName("");
    setWinnerPrompt("");
    setWinnerImages([]);
    setHasVoted(false);
    setVoteMessage("");
    setRoundDeadline(null);
    setVotingDeadline(null);
  } catch (error) {
    console.error("Failed to return to lobby:", error);
    showToast(`Could not return to the lobby: ${error instanceof Error ? error.message : "Unknown database error"}`);
  } finally {
    setIsForcingStage(false);
  }
}

async function endVotingEarly() {
  if (!isHost || !currentGameId || isForcingStage) return;
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  setIsForcingStage(true);

  try {
    const { error } = await supabase.rpc("end_voting_now", {
      game_id_input: currentGameId,
      host_player_id_input: Number(savedPlayerId),
      room_code_input: code,
    });

    if (error) throw error;

    setStage("winner");
  } catch (error) {
    console.error("Failed to end voting:", error);
    showToast(`Could not end voting: ${error instanceof Error ? error.message : "Unknown database error"}`);
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

  const tiedSubmissionDetails = tiedSubmissions.map((submission) => {
    const [playerNamePart, ...promptParts] = submission.split(":");

    return {
      playerName: playerNamePart.trim(),
      promptText: promptParts.join(":").trim(),
      voteValue: submission,
    };
  });

  const { data: winningSubmissionImages, error: winningImagesError } = await supabase
    .from("submissions")
    .select("player_name, prompt, image_url, gallery_thumbnail_url")
    .eq("game_id", currentGameId)
    .in(
      "player_name",
      tiedSubmissionDetails.map((submission) => submission.playerName)
    );

  if (winningImagesError) {
    console.error(winningImagesError);
  }

  const winningImagesByVoteValue = new Map(
    (winningSubmissionImages || []).map((submission) => [
      `${submission.player_name}: ${submission.prompt}`,
      submission,
    ])
  );

  const winningImages = tiedSubmissionDetails
    .map((submission) => winningImagesByVoteValue.get(submission.voteValue)?.image_url)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  setWinnerImages(winningImages);

  if (tiedSubmissions.length > 1) {
    const tiedNames = tiedSubmissionDetails.map((submission) => submission.playerName);

    setWinnerName(`Tie: ${tiedNames.join(" and ")}`);

    const tiedPrompts = tiedSubmissionDetails.map((submission) => submission.promptText).join(" / ");

    setWinnerPrompt(tiedPrompts);

    setWinner(`Tie! ${tiedSubmissions.join(" and ")} each get 1 point.`);
  } else {
    const winningSubmission = tiedSubmissionDetails[0];
    const displayWinnerName = winningSubmission.playerName;
    const displayWinnerPrompt = winningSubmission.promptText;

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
  const winnerNames = tiedSubmissionDetails.map((submission) => submission.playerName);

  const { error: awardError } = await supabase.rpc("award_winners_once", {
    winner_names_input: winnerNames,
    room_code_input: code,
    game_id_input: gameData.id,
  });

  if (awardError) {
    console.error("Award error:", awardError);
    showToast(`Could not award points: ${awardError.message || "Unknown database error"}`);
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

  const roundHistoryRows = tiedSubmissionDetails.map((winningSubmission) => ({
      room_code: code,
      game_id: gameData.id,
      round_number: nextRoundNumber,
      winner_name: winningSubmission.playerName,
      winner_prompt: winningSubmission.promptText,
      winner_image_url: winningImagesByVoteValue.get(winningSubmission.voteValue)?.image_url || null,
      gallery_thumbnail_url:
        winningImagesByVoteValue.get(winningSubmission.voteValue)?.gallery_thumbnail_url || null,
    }));

  if (roundHistoryRows.length > 0) {
    const { error: roundHistoryError } = await supabase.from("round_history").upsert(
      roundHistoryRows,
      {
        onConflict: "room_code,game_id,winner_name,winner_prompt",
      }
    );

    if (roundHistoryError) {
      console.error("Failed to save round history:", roundHistoryError);
    }
  }
}


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
      showToast("Could not load the next prompt");
      return;
    }

    const newRound = await createRoundFromPrompt(newPrompt);
    if (!newRound) return;

    setCurrentGameId(newRound.gameId);
    setCurrentPromptId(newPrompt.id);
    setCurrentPromptSource(newPrompt.source);
    setCurrentPromptRating(newPrompt.rating);
    setRoundPrompt(newPrompt.prompt);
    setRoundImageStyle(newRound.activeImageStyle);
    setRoundDeadline(newRound.submissionDeadline);
    setVotingDeadline(null);
    setStage("submitting"); // Move this browser immediately.
    setHasVoted(false);
    setPromptSkipVoteCount(0);
    setHasVotedToSkipPrompt(false);
    setVoteMessage("");
    setSubmission("");
    setSubmissions([]);
    setWinner("");
  } catch (error) {
    console.error("Failed to start next round:", error);
    showToast("Could not start the next round. Check the browser console.");
  } finally {
    setIsAdvancing(false);
  }
}

async function playAgain() {
  if (!isHost || !currentGameId || isPlayingAgain) return;
  const savedPlayerId = window.localStorage.getItem(playerStorageKey);

  if (!savedPlayerId) {
    showToast("Your host session was lost. Please rejoin the room.");
    return;
  }

  setIsPlayingAgain(true);

  try {
    const { error } = await supabase.rpc("start_rematch", {
      game_id_input: currentGameId,
      host_player_id_input: Number(savedPlayerId),
      room_code_input: code,
    });

    if (error) throw error;

    setFinalWinner("");
    setWinner("");
    setWinnerName("");
    setWinnerPrompt("");
    setWinnerImages([]);
    setSubmissions([]);
    setVotedPlayerNames([]);
    setRoundDeadline(null);
    setVotingDeadline(null);
    setStage("lobby");
    await loadPlayers();
    await loadScoreboard();
  } catch (error) {
    console.error("Failed to start a rematch:", error);
    showToast("Could not start a rematch.");
  } finally {
    setIsPlayingAgain(false);
  }
}


function getSafeImageFileName(imageCaption: string) {
  const safeName = imageCaption
    .slice(0, 30)
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `${safeName || "picture_this"}.png`;
}

async function saveImage(imageUrl: string, imageCaption: string) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = getSafeImageFileName(imageCaption);

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    showToast("Could not save image");
  }
}

async function shareImage(imageUrl: string, imageCaption: string) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

    const blob = await response.blob();
    const file = new File([blob], getSafeImageFileName(imageCaption), {
      type: blob.type || "image/png",
    });

    const canShareFile =
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });

    if (canShareFile) {
      await navigator.share({
        files: [file],
        text: imageCaption,
        title: "Picture This",
      });
      return;
    }

    await saveImage(imageUrl, imageCaption);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }

    console.error(error);
    showToast("Could not share image");
  }
}


async function loadScoreboard() {
  const { data, error } = await supabase
    .from("players")
    .select("name, points, avatar_url")
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

  const leader = sortedPlayers[0];

  if (leader && leader.points >= 3) {
    setFinalWinner(`${leader.name} wins the game with ${leader.points} points!`);
  }
}
if (isJoining) {
  return (
    <>
      {toastNotice}
      <LoadingScreen title="Joining Room..." message="Gathering the troublemakers" />
    </>
  );
}

if (isPageLoading) {
  return (
    <>
      {toastNotice}
      <LoadingScreen title="Loading Game..." message="Getting the chaos ready" />
    </>
  );
}


  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#fff7ed] p-6 text-zinc-950">
      {toastNotice}
      <GameLogo />

      {reconnectMessage && (
        <div className="rounded-full border-2 border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-black text-emerald-800 shadow-[4px_4px_0_#111827]">
          {reconnectMessage}
        </div>
      )}

      {isHost && (
        <HostDebugPanel
          currentGameId={currentGameId}
          playersCount={players.length}
          stage={stage}
          submissionsCount={submissions.length}
          votesCount={votedPlayerNames.length}
          stats={hostDebugStats}
        />
      )}

      {!joined ? (
  <JoinRoomForm
    code={code}
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
    roomExpirationMessage={roomExpirationMessage}
    promptSuggestions={promptSuggestions}
    promptSuggestionText={promptSuggestionText}
    promptSuggestionRating={promptSuggestionRating}
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
    onSubmitPromptSuggestion={submitPromptSuggestion}
    onVotePromptSuggestion={voteForPromptSuggestion}
    onRemovePlayer={removePlayer}
  />
) : stage === "submitting" ? (
  <>
    {showRoundIntro && (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fff7ed] p-6 text-center text-zinc-950">
        <div className="rounded-[2rem] border-2 border-black bg-white p-8 shadow-[8px_8px_0_#111827]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-700">Get ready</p>
          <h2 className="mt-2 text-6xl font-black">Round {currentRoundNumber}</h2>
          <p className="mt-3 text-xl font-bold text-zinc-600">
            {selectedGameMode === "cards" ? "Fill in the blank." : "Write the funniest answer."}
          </p>
        </div>
      </div>
    )}
    <RoundPromptCard
      gameMode={selectedGameMode}
      prompt={roundPrompt}
      imageStyle={roundImageStyle}
      timeRemainingSeconds={timeRemainingSeconds}
      expiredMessage="Time's up — waiting for the host"
      activeTimerLabel="Time remaining"
      skipVoteCount={promptSkipVoteCount}
      skipVotesNeeded={promptSkipVotesNeeded}
      hasVotedToSkip={hasVotedToSkipPrompt}
      isVotingToSkip={isVotingToSkipPrompt}
      formatCountdown={formatCountdown}
      getImageStyleLabel={getImageStyleLabel}
      onVoteToSkip={voteToSkipPrompt}
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
        waitingOnSubmissionNames={waitingOnSubmissionNames}
        waitingOnImageNames={waitingOnImageNames}
        roundPrompt={roundPrompt}
        currentPromptRating={currentPromptRating}
        hasRatedCurrentPrompt={hasRatedCurrentPrompt}
        hostDebugPanel={
          <HostDebugPanel
            currentGameId={currentGameId}
            playersCount={players.length}
            stage={stage}
            submissionsCount={submissions.length}
            votesCount={votedPlayerNames.length}
            stats={hostDebugStats}
          />
        }
        isRatingCurrentPrompt={isRatingCurrentPrompt}
        canRateCurrentPrompt={Boolean(getPromptRatingTable(currentPromptSource))}
        onForceReveal={forceReveal}
        onReturnToLobby={returnToLobby}
        onRateCurrentPrompt={rateCurrentPrompt}
      />
    ) : (
  <SubmissionForm
    gameMode={selectedGameMode}
    submission={submission}
    isSubmitting={isSubmitting}
    isSubmissionTimeExpired={isSubmissionTimeExpired}
    isHost={isHost}
    submissionsCount={submissions.length}
    waitingOnPlayerNames={waitingOnSubmissionNames}
    isForcingStage={isForcingStage}
    isAdvancing={isAdvancing}
    onSubmissionChange={setSubmission}
    onSubmit={submitPrompt}
    onForceReveal={forceReveal}
    onSkipRound={nextRound}
    onReturnToLobby={returnToLobby}
  />
)}
  </>
      ) : stage === "generating" ? (
  <div className="min-h-screen w-full bg-[#fff7ed] flex flex-col items-center justify-center text-zinc-950">
    <div className="mb-6 h-16 w-16 animate-spin rounded-full border-8 border-rose-200 border-t-rose-600" />

    <h2 className="text-4xl font-black mb-4">
      Creating Chaos...
    </h2>

    <p className="text-xl text-center max-w-md font-bold text-zinc-600">
      The AI is cooking up something ridiculous.
    </p>

    <div className="mt-8 animate-pulse text-lg font-black text-rose-700">
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
      waitingOnVoteNames={waitingOnVoteNames}
      onEndVotingEarly={endVotingEarly}
      onReturnToLobby={returnToLobby}
      onVote={voteForSubmission}
      onSaveImage={saveImage}
      onShareImage={shareImage}
      onDeleteSubmission={deleteSubmission}
      onRateImage={rateImage}
      onReportImage={reportImage}
      onRegenerateImage={regenerateImage}
      formatCountdown={formatCountdown}
      getImageStyleLabel={getImageStyleLabel}
    />
/* =======================================
   WINNER SCREEN
======================================= */
) : stage === "winner" ? (
 <WinnerScreen
  code={code}
  confettiPieces={confettiPieces}
  winnerImages={winnerImages}
  winnerName={winnerName}
  winnerPrompt={winnerPrompt}
  winner={winner}
  players={players}
  scoreboardPlayers={scoreboardPlayers}
  finalWinner={finalWinner}
  roundHistory={roundHistory}
  isHost={isHost}
  hostName={hostName}
  isPlayingAgain={isPlayingAgain}
  isAdvancing={isAdvancing}
  onPlayAgain={playAgain}
  onNextRound={nextRound}
  onReturnToLobby={returnToLobby}
/>
) : (
  <p>Unknown game stage.</p>
)}
</main>
  );
}



