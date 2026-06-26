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
import { useRoundCountdowns } from "./hooks/useRoundCountdowns";
import { useRoundReadiness } from "./hooks/useRoundReadiness";
import { useRotatingPastImages } from "./hooks/useRotatingPastImages";
import { ratePrompt } from "./components/promptQuality";
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
  const [reconnectMessage, setReconnectMessage] = useState("");
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([]);
  const [promptSuggestionText, setPromptSuggestionText] = useState("");
  const [promptSuggestionMode, setPromptSuggestionMode] = useState<GameMode>("classic");
  const [isSubmittingPromptSuggestion, setIsSubmittingPromptSuggestion] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedPlayerNames, setVotedPlayerNames] = useState<string[]>([]);
  const [voteMessage, setVoteMessage] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [winnerPrompt, setWinnerPrompt] = useState("");
  const [winnerImages, setWinnerImages] = useState<string[]>([]);
  const [roundPrompt, setRoundPrompt] = useState("");
  const [roundImageStyle, setRoundImageStyle] = useState("cartoon");
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
  const promptApprovalVotesNeeded = Math.max(2, Math.ceil(players.length / 2));
  const promptSuggestionRating = ratePrompt(promptSuggestionText, promptSuggestionMode);

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

  const shouldRemove = window.confirm(
    `Remove ${player.name} from this room? Their submissions and votes in this room will also be removed.`
  );

  if (!shouldRemove) return;

  try {
    const { error: submissionsError } = await supabase
      .from("submissions")
      .delete()
      .eq("room_code", code)
      .eq("player_name", player.name);

    if (submissionsError) throw submissionsError;

    const { error: votesError } = await supabase
      .from("votes")
      .delete()
      .eq("room_code", code)
      .eq("voter_name", player.name);

    if (votesError) throw votesError;

    const { error: votedForError } = await supabase
      .from("votes")
      .delete()
      .eq("room_code", code)
      .like("voted_for", `${player.name}: %`);

    if (votedForError) throw votedForError;

    const { error: playerError } = await supabase
      .from("players")
      .delete()
      .eq("id", player.id)
      .eq("room_code", code)
      .eq("is_host", false);

    if (playerError) throw playerError;

    await Promise.all([
      loadPlayers(),
      loadSubmissions(),
      loadVotes(),
      loadScoreboard(),
    ]);
  } catch (error) {
    console.error("Failed to remove player:", error);
    alert("Could not remove that player.");
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

    const { error: voteError } = await supabase.from("room_prompt_suggestion_votes").insert({
      room_code: code,
      suggestion_id: suggestion.id,
      voter_name: name,
    });

    if (voteError) throw voteError;

    setPromptSuggestionText("");
    await loadPromptSuggestions();
  } catch (error) {
    console.error("Failed to submit prompt suggestion:", error);
    const message = error instanceof Error ? error.message : "Unknown Supabase error";
    alert(`Could not submit that prompt suggestion: ${message}`);
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
      `${item.prompt}|||${item.image_url || ""}|||${item.player_name}|||${
        item.image_caption || "Untitled Masterpiece"
      }`
    )
  );
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
  } catch (error) {
    console.error("Failed to rate current prompt:", error);
    alert("Could not save that prompt rating.");
  } finally {
    setIsRatingCurrentPrompt(false);
  }
}

async function loadGame() {
  
  const { data, error } = await supabase
    .from("games")
    .select("id, stage, prompt, prompt_id, prompt_source, game_mode, image_style, submission_deadline, voting_deadline, voting_duration_seconds")
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
  async function loadInitialData() {
    setIsPageLoading(true);

    await Promise.all([
    loadPlayers(),
    loadGame(),
    loadSubmissions(),
    loadVotes(),
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
  loadVotes();
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
      alert("Failed to check your saved player.");
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

  const { data: roomPlayers, error: roomPlayersError } = await supabase
    .from("players")
    .select("id, name")
    .eq("room_code", code);

  if (roomPlayersError) {
    console.error(roomPlayersError);
    alert("Failed to check the room");
    return;
  }

  const nameAlreadyTaken = (roomPlayers || []).some((player) => arePlayerNamesEqual(player.name, cleanName));

  if (nameAlreadyTaken) {
    alert("That name is already taken in this room. Pick another name, or rejoin from the same device you used before.");
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

    const playerCount = roomPlayers?.length || 0;
    const cameFromCreateGame = new URLSearchParams(window.location.search).get("create") === "1";

    if (playerCount === 0 && !cameFromCreateGame) {
      alert("Game not found. Check the room code and try again.");
      return;
    }

    if (playerCount >= MAX_PLAYERS) {
      alert("This room is full (8 players max).");
      return;
    }

    const isFirstPlayer = playerCount === 0;

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
      if (error.code === "23505") {
        alert("That name was just taken in this room. Pick another name.");
        return;
      }
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
    setCurrentPromptId(randomPrompt.id);
    setCurrentPromptSource(randomPrompt.source);
    setCurrentPromptRating(randomPrompt.rating);
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
  const submittedAnswer = submission.trim();

  setIsSubmitting(true);

  try {
    const { data: pendingSubmission, error: pendingSubmissionError } = await supabase
      .from("submissions")
      .insert([
        {
          room_code: code,
          game_id: currentGameId,
          player_name: name,
          prompt: submittedAnswer,
          image_url: null,
          gallery_thumbnail_url: null,
          image_caption: null,
        },
      ])
      .select("id")
      .single();

    if (pendingSubmissionError) {
      console.error(pendingSubmissionError);
      alert("Failed to submit prompt");
      return;
    }

    await loadSubmissions(currentGameId);

    setLoadingMessage(
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
    );

    const savedPlayerId = window.localStorage.getItem(playerStorageKey);

    if (!savedPlayerId) {
      alert("Your player session was lost. Please rejoin the room.");
      await supabase.from("submissions").delete().eq("id", pendingSubmission.id);
      await loadSubmissions(currentGameId);
      return;
    }

    const imageResponse = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: code,
        gameId: currentGameId,
        playerId: savedPlayerId,
        submissionId: pendingSubmission.id,
      }),
    });

    const imageData = await imageResponse.json();

    if (!imageResponse.ok) {
      console.error(imageData);
      if (imageData.rejected) {
        const wasExtended = await grantImageRetryTime();
        alert(
          wasExtended
            ? "The AI got weird about that one. You have an extra minute to tweak your answer and try again."
            : "The AI got weird about that one. Try a slightly different version."
        );
      } else {
        alert("The image machine tripped over its own shoelaces. Try submitting again.");
      }
      await supabase.from("submissions").delete().eq("id", pendingSubmission.id);
      await loadSubmissions(currentGameId);
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
  await loadVotes(currentGameId);

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
      .select("id, image_url")
      .eq("game_id", currentGameId)
      .not("image_url", "is", null);

    if (submissionsError) throw submissionsError;

    if (!readySubmissions?.length) {
      alert("At least one finished image is needed before reveal.");
      return;
    }

    const { error: pendingDeleteError } = await supabase
      .from("submissions")
      .delete()
      .eq("game_id", currentGameId)
      .is("image_url", null);

    if (pendingDeleteError) throw pendingDeleteError;

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
    await loadSubmissions(currentGameId);
  } catch (error) {
    console.error("Failed to reveal submitted images:", error);
    alert("Could not reveal the submitted images.");
  } finally {
    setIsForcingStage(false);
  }
}

async function returnToLobby() {
  if (!isHost || !currentGameId || isForcingStage) return;

  const shouldReturn = window.confirm(
    "Return everyone to the lobby? Scores stay the same, but the current round will stop."
  );

  if (!shouldReturn) return;

  setIsForcingStage(true);

  try {
    const { error } = await supabase
      .from("games")
      .update({ stage: "lobby" })
      .eq("id", currentGameId);

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
    alert("Could not return to the lobby.");
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
    setCurrentPromptId(newPrompt.id);
    setCurrentPromptSource(newPrompt.source);
    setCurrentPromptRating(newPrompt.rating);
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
    setVotedPlayerNames([]);
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
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-purple-50 p-6">
      <GameLogo />

      {reconnectMessage && (
        <div className="rounded-full border border-green-200 bg-green-50 px-5 py-2 text-sm font-extrabold text-green-700 shadow-sm">
          {reconnectMessage}
        </div>
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
    promptSuggestions={promptSuggestions}
    promptSuggestionText={promptSuggestionText}
    promptSuggestionMode={promptSuggestionMode}
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
    onPromptSuggestionModeChange={setPromptSuggestionMode}
    onSubmitPromptSuggestion={submitPromptSuggestion}
    onVotePromptSuggestion={voteForPromptSuggestion}
    onRemovePlayer={removePlayer}
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
        waitingOnSubmissionNames={waitingOnSubmissionNames}
        waitingOnImageNames={waitingOnImageNames}
        roundPrompt={roundPrompt}
        currentPromptRating={currentPromptRating}
        hasRatedCurrentPrompt={hasRatedCurrentPrompt}
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
      waitingOnVoteNames={waitingOnVoteNames}
      onEndVotingEarly={endVotingEarly}
      onReturnToLobby={returnToLobby}
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

