"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameStage = "lobby" | "submitting" | "generating" | "reveal" | "winner";
type PromptOption = { id: number; prompt: string; image_style: string | null };

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

export default function GameRoom() {
  const params = useParams();
  const code = params.code as string;
  const playerStorageKey = `picture-this:${code}:player-id`;

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  type Player = {
  name: string;
  points: number;
  avatar_url: string | null;
  avatar_description?: string |null;
  is_host: boolean;
};

  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<GameStage>("lobby");
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [submission, setSubmission] = useState("");
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [winner, setWinner] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [scoreboard, setScoreboard] = useState<any[]>([]);
  const [scoreboardPlayers, setScoreboardPlayers] = useState<any[]>([]);
  const [finalWinner, setFinalWinner] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Generating chaos...");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Random");
  const [selectedGameMode, setSelectedGameMode] = useState<"classic" | "cards">("classic");
  const [selectedImageStyle, setSelectedImageStyle] = useState("prompt");
  const [selectedRoundDuration, setSelectedRoundDuration] = useState(90);
  const [selectedVotingDuration, setSelectedVotingDuration] = useState(45);
  const [isRoundCustomizationOpen, setIsRoundCustomizationOpen] = useState(false);
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
  const [hasVoted, setHasVoted] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");
  const [winnerImageUrl, setWinnerImageUrl] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [winnerPrompt, setWinnerPrompt] = useState("");
  const [winnerImages, setWinnerImages] = useState<string[]>([]);
  const hostName = players.find((player) => player.is_host)?.name;
  const isHost = joined && name === hostName;
  const [roundHistory, setRoundHistory] = useState<any[]>([]);
  const [pastImages, setPastImages] = useState<string[]>([]);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [isGalleryImageVisible, setIsGalleryImageVisible] = useState(true);
  const hasSubmitted = submissions.some((item) => {
  const parts = item.split("|||");
  const playerName = parts[2];
  return playerName === name;
});
  const hasCurrentRoundImage = submissions.some((item) =>
    Boolean(item.split("|||")[1])
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

  if (!data?.length) {
    return null;
  }

  const { data: usedGames, error: usedGamesError } = await supabase
    .from("games")
    .select("prompt_id")
    .eq("room_code", code)
    .eq("prompt_source", selectedGameMode)
    .not("prompt_id", "is", null);

  if (usedGamesError) {
    console.error("Failed to load used prompts:", usedGamesError);
    return null;
  }

  const usedPromptIds = new Set((usedGames || []).map((game) => game.prompt_id));
  const unusedPrompts = (data as PromptOption[]).filter(
    (prompt) => !usedPromptIds.has(prompt.id)
  );
  const promptDeck = unusedPrompts.length > 0 ? unusedPrompts : data as PromptOption[];

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

async function loadSubmissions(gameId = currentGameId) {
  if (!gameId) {
    setSubmissions([]);
    return;
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("player_name, prompt, image_url")
    .eq("room_code", code)
    .eq("game_id", gameId)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setSubmissions(
  data.map(
    (item) => `${item.prompt}|||${item.image_url}|||${item.player_name}`
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

    ]);

    await restoreJoinedPlayer();

    setIsPageLoading(false);
  }

  loadInitialData();

  const interval = setInterval(() => {
  loadPlayers();
  loadGame();
  loadScoreboard();
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
    const submissionDeadline = new Date(
      Date.now() + selectedRoundDuration * 1000
    ).toISOString();

    console.log("Selected CAH prompt:", randomPrompt.prompt);

    const { data: newGame, error } = await supabase.from("games").insert([
      {
        room_code: code,
        stage: "submitting",
        prompt: randomPrompt.prompt,
        prompt_id: randomPrompt.id,
        prompt_source: selectedGameMode,
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
  const currentPlayer = players.find((player) => player.name === name);

  setIsSubmitting(true);

  try {
    const imagePrompt = `
You are creating a hilarious party game image.

Question:
${roundPrompt}

Player Answer:
${submission.trim()}

Player Appearance:
${currentPlayer?.avatar_description || "Generic person"}

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
      body: JSON.stringify({ prompt: imagePrompt }),
    });

    const imageData = await imageResponse.json();

    if (!imageResponse.ok) {
      console.error(imageData);
      alert("Image generation failed");
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
    const submissionDeadline = new Date(
      Date.now() + selectedRoundDuration * 1000
    ).toISOString();

    const { data: newGame, error: gameError } = await supabase
      .from("games")
      .insert({
        room_code: code,
        stage: "submitting",
        prompt: newPrompt.prompt,
        prompt_id: newPrompt.id,
        prompt_source: selectedGameMode,
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

setScoreboard(
  sortedPlayers.map((player) => `${player.name} - ${player.points ?? 0}`)
);

  const leader = data[0];

  if (leader && leader.points >= 3) {
    setFinalWinner(`${leader.name} wins the game with ${leader.points} points!`);
  }
}
if (isJoining) {
  return (
    <div className="fixed inset-0 bg-purple-700 text-white flex flex-col items-center justify-center space-y-6">
      <div className="text-7xl animate-bounce">👑</div>
      <h1 className="text-3xl font-bold">Joining Room...</h1>
      <p className="opacity-80">Gathering the troublemakers</p>
    </div>
  );
}

if (isPageLoading) {
  return (
    <div className="fixed inset-0 bg-purple-700 text-white flex flex-col items-center justify-center space-y-6">
      <div className="text-7xl animate-bounce">👑</div>
      <h1 className="text-3xl font-bold">Loading Game...</h1>
      <p className="opacity-80">Getting the chaos ready</p>
    </div>
  );
}


  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
  <h1 className="text-4xl font-black tracking-tight">
    <span className="inline-block -rotate-2 text-purple-600">Picture</span>{" "}
    <span className="inline-block rotate-2 bg-black text-white px-3 py-1 rounded-xl">
      This
    </span>
  </h1>
</div>

      {!joined ? (
  <>
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Enter your name"
      className="border p-3 rounded-xl"
    />

    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        setAvatarFile(e.target.files?.[0] || null);
      }}
      className="border p-3 rounded-xl"
    />

    <button
  onClick={joinGame}
  disabled={isJoining}
  className="bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50"
>
  {isJoining ? "Joining..." : "Join Room"}
</button>
  </>
) : stage === "lobby" ? (
        <>
          <div className="text-center">
            <h2 className="text-3xl font-black">Waiting for Players</h2>
            <p className="mt-1 text-sm font-bold text-purple-600">
              {players.length} / {MAX_PLAYERS} players in the room
            </p>
          </div>

          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold">Players</h3>
              <p className="text-sm text-gray-500">
                {players.length === MAX_PLAYERS
                  ? "The room is full!"
                  : `Waiting for ${MAX_PLAYERS - players.length} more player${MAX_PLAYERS - players.length === 1 ? "" : "s"}.`}
              </p>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-extrabold text-purple-700">
              {players.length} / {MAX_PLAYERS}
            </span>
          </div>

          <div className="mb-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${MAX_PLAYERS}, minmax(0, 1fr))` }}>
            {Array.from({ length: MAX_PLAYERS }, (_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full ${index < players.length ? "bg-purple-600" : "bg-gray-200"}`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
  {players.map((player, index) => (
    <div
      key={index}
      className="border rounded-xl p-3 flex items-center gap-3"
    >
      {player.avatar_url ? (
        <img
          src={player.avatar_url}
          alt={player.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
          👤
        </div>
      )}

     <div>
  <div className="font-bold">
    {player.name}
    {player.is_host && (
      <span className="ml-2 text-yellow-500">
        👑 Host
      </span>
    )}
  </div>

  <div className="text-sm text-gray-500">
    {player.points} pts
  </div>
</div>
    </div>
  ))}
</div>
          </div>
          <div className="flex w-full flex-col gap-4">
  {isHost ? (
    <>
  <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-purple-50 p-4">
    <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-purple-700">
      Choose game mode
    </p>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => setSelectedGameMode("classic")}
        disabled={!isHost}
        className={`rounded-xl border-2 p-3 text-left transition disabled:cursor-default ${
          selectedGameMode === "classic"
            ? "border-purple-600 bg-white shadow-sm"
            : "border-transparent bg-white/60 hover:border-purple-200"
        }`}
      >
        <span className="block font-extrabold">Classic</span>
        <span className="text-xs text-gray-500">Write a funny answer</span>
      </button>
      <button
        type="button"
        onClick={() => setSelectedGameMode("cards")}
        disabled={!isHost}
        className={`rounded-xl border-2 p-3 text-left transition disabled:cursor-default ${
          selectedGameMode === "cards"
            ? "border-black bg-black text-white shadow-sm"
            : "border-transparent bg-white/60 hover:border-purple-200"
        }`}
      >
        <span className="block font-extrabold">Fill in the Blank</span>
        <span className={`text-xs ${selectedGameMode === "cards" ? "text-gray-300" : "text-gray-500"}`}>
          Complete a prompt card
        </span>
      </button>
    </div>
    {!isHost && (
      <p className="mt-3 text-xs text-gray-500">Only the host can choose the game mode.</p>
    )}
  </div>

    <button
      onClick={startGame}
      disabled={isStarting || players.length < 2}
      className="w-full max-w-xl bg-green-600 text-white px-6 py-4 rounded-2xl font-extrabold shadow-lg disabled:opacity-50"
    >
      {isStarting ? "Starting..." : "Start Game"}
    </button>

    {players.length < 2 && (
      <p className="text-center text-sm font-bold text-purple-700">
        Waiting for one more player to join.
      </p>
    )}

    <div className="w-full max-w-xl">
      <button
        type="button"
        onClick={() => setIsRoundCustomizationOpen((open) => !open)}
        aria-expanded={isRoundCustomizationOpen}
        className="w-full rounded-xl border border-purple-200 px-4 py-3 font-bold text-purple-700"
      >
        {isRoundCustomizationOpen ? "Hide Round Settings" : "Customize Round"}
      </button>

      {isRoundCustomizationOpen && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-purple-200 bg-purple-50 p-4">
    {selectedGameMode === "classic" && (
    <div>
    <label className="mb-2 block text-sm font-bold text-purple-600">
      Prompt category
    </label>
    <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="w-full border p-3 rounded-xl"
      >
      <option value="Random">🎲 Random</option>
      <option value="personal">👥 Personal</option>
      <option value="history">🏰 History</option>
      <option value="animals">🐻 Animals</option>
      <option value="sports">🏈 Sports</option>
      <option value="food">🍕 Food</option>
      <option value="work">💼 Work</option>
      <option value="general">🎉 General</option>
      <option value="chaos">🤪 Chaos</option>
      <option value="dating">❤️ Dating</option>
    </select>
    </div>
    )}

    <div className="w-full max-w-xl">
      <label className="mb-2 block text-sm font-bold text-purple-600">
        Image style
      </label>
      <select
        value={selectedImageStyle}
        onChange={(e) => setSelectedImageStyle(e.target.value)}
        disabled={!isHost}
        className="w-full border p-3 rounded-xl"
      >
        <option value="prompt">Prompt's style</option>
        <option value="cartoon">Colorful Cartoon</option>
        <option value="comic_book">Comic Book</option>
        <option value="clay_animation">Clay Animation</option>
        <option value="storybook">Storybook</option>
        <option value="pixel_art">Pixel Art</option>
      </select>
    </div>

    <div className="w-full max-w-xl">
      <label className="mb-2 block text-sm font-bold text-purple-600">
        Answer timer
      </label>
      <select
        value={selectedRoundDuration}
        onChange={(e) => setSelectedRoundDuration(Number(e.target.value))}
        disabled={!isHost}
        className="w-full border p-3 rounded-xl"
      >
        <option value={60}>1 minute</option>
        <option value={90}>1 minute 30 seconds</option>
        <option value={120}>2 minutes</option>
        <option value={180}>3 minutes</option>
      </select>
    </div>

    <div className="w-full max-w-xl">
      <label className="mb-2 block text-sm font-bold text-purple-600">
        Voting timer
      </label>
      <select
        value={selectedVotingDuration}
        onChange={(e) => setSelectedVotingDuration(Number(e.target.value))}
        className="w-full border p-3 rounded-xl"
      >
        <option value={30}>30 seconds</option>
        <option value={45}>45 seconds</option>
        <option value={60}>1 minute</option>
        <option value={90}>1 minute 30 seconds</option>
      </select>
    </div>
        </div>
      )}
    </div>

    {isHost && (
      <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-white p-4 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Invite your friends
        </p>
        <p className="mt-1 text-3xl font-black tracking-widest text-purple-700">
          {code}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={copyRoomCode}
            className="rounded-xl bg-black px-4 py-3 font-bold text-white"
          >
            Copy Code
          </button>
          <button
            type="button"
            onClick={shareRoom}
            className="rounded-xl bg-purple-600 px-4 py-3 font-bold text-white"
          >
            Share Game
          </button>
        </div>
        {roomShareMessage && (
          <p className="mt-2 text-sm font-bold text-green-700">{roomShareMessage}</p>
        )}
      </div>
    )}

</>
) : (
  <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-purple-50 p-4 text-center">
    <p className="font-bold">
      Game mode: {selectedGameMode === "cards" ? "Fill in the Blank" : "Classic"}
    </p>
    <p className="mt-2 text-sm text-gray-500">
      Waiting for {hostName || "the host"} to start the game...
    </p>
  </div>
)}
</div>
</div>
</>
) : stage === "submitting" ? (
  <>
    <div
  className={`w-full max-w-2xl rounded-3xl p-6 text-center shadow-xl ${
    selectedGameMode === "cards"
      ? "bg-black text-white"
      : "bg-white text-black"
  }`}
>
  <div
    className={`mb-3 text-sm font-extrabold tracking-wider ${
      selectedGameMode === "cards"
        ? "text-gray-300"
        : "text-purple-600"
    }`}
  >
    {selectedGameMode === "cards"
      ? "FILL IN THE BLANK"
      : "ROUND PROMPT"}
  </div>

  <h2 className="break-words text-3xl font-black leading-tight">
    {roundPrompt}
  </h2>

  {timeRemainingSeconds !== null && (
    <p className="mt-4 text-lg font-extrabold">
      {isSubmissionTimeExpired
        ? "Time's up — waiting for the host"
        : `Time remaining: ${formatCountdown(timeRemainingSeconds)}`}
    </p>
  )}
</div>

    {hasSubmitted || isSubmitting ? (
  <div className="fixed inset-0 bg-purple-700 text-white overflow-hidden z-50">
    {!hasCurrentRoundImage && currentGalleryImage && (
      <div className="absolute inset-0 bg-purple-950">
        <img
          src={currentGalleryImage}
          alt="A past winning image"
          className="w-full h-full object-contain transition-opacity duration-500"
          style={{ opacity: isGalleryImageVisible ? 1 : 0 }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(76, 0, 128, 0.72)" }}
        />
      </div>
    )}

    <div className="relative z-50 flex min-h-full w-full flex-col items-center justify-center gap-5 p-6">
    <div className="text-6xl animate-bounce">🎨</div>

    <h2 className="text-3xl font-extrabold">
      Generating Images...
    </h2>

    <p className="text-lg text-center max-w-md">
      {loadingMessage || "Adding maximum chaos..."}
    </p>

    <p className="text-sm opacity-80 font-bold">
      {submissions.length} / {players.length} ready
    </p>

    {(hasCurrentRoundImage || !currentGalleryImage) && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
      {players.map((player) => {
        const playerSubmission = submissions.find((item) => {
          const [text, imageUrl, playerName] = item.split("|||");
          return playerName === player.name;
        });

        const [text, imageUrl] = playerSubmission
          ? playerSubmission.split("|||")
          : ["", ""];

        return (
          <div
            key={player.name}
            className="bg-purple-900/60 rounded-2xl p-3 text-center border border-white/20"
          >
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={text}
                  className="w-full aspect-square object-cover rounded-xl mb-2"
                />

                <p className="text-sm font-bold truncate">
                  {player.name} ✅
                </p>
              </>
            ) : (
              <>
                <div className="w-full aspect-square rounded-xl bg-purple-800 flex flex-col items-center justify-center mb-2">
                  <div className="text-4xl animate-pulse">⏳</div>
                  <p className="text-xs mt-2 opacity-80">Generating...</p>
                </div>

                <p className="text-sm font-bold">
                  {player.name}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
    )}

    {isHost && submissions.length > 0 && (
      <button
        type="button"
        onClick={forceReveal}
        disabled={isForcingStage}
        className="bg-white text-purple-700 px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
      >
        {isForcingStage ? "Opening Reveal..." : "Reveal Submitted Images"}
      </button>
    )}
    </div>
  </div>
) : (
  <>
    <div
      className={`w-full max-w-xl rounded-3xl p-5 shadow-lg ${
        selectedGameMode === "cards"
          ? "border-4 border-black bg-white"
          : "border border-gray-200 bg-white"
      }`}
    >
      <label className="block text-sm font-bold text-purple-600 mb-2">
        {selectedGameMode === "cards"
          ? "Complete the prompt"
          : "Your Answer"}
      </label>

      <textarea
        value={submission}
        onChange={(e) => setSubmission(e.target.value)}
        placeholder={
          selectedGameMode === "cards"
            ? "Write the funniest possible fill-in..."
            : "Make your friends laugh..."
        }
        maxLength={120}
        disabled={isSubmissionTimeExpired}
        className="w-full border-2 border-purple-300 rounded-2xl p-4 text-lg min-h-40 resize-none focus:outline-none focus:border-purple-500"
      />

      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-gray-500">
          {selectedGameMode === "cards"
            ? isSubmissionTimeExpired
              ? "Time is up for this round."
              : "Short, specific, and delightfully wrong."
            : isSubmissionTimeExpired
              ? "Time is up for this round."
              : "Think punchline, not paragraph."}
        </p>

        <p className="text-sm text-gray-500">
          {submission.length}/120
        </p>
      </div>
    </div>

    <button
      onClick={submitPrompt}
      disabled={isSubmitting || isSubmissionTimeExpired || !submission.trim()}
      className="bg-blue-600 text-white px-8 py-3 rounded-2xl disabled:opacity-50 font-bold shadow-lg"
    >
      {isSubmitting
        ? "Submitting..."
        : selectedGameMode === "cards"
          ? "Lock In Fill"
      : "Lock In Answer"}
    </button>

    {isHost && submissions.length > 0 && (
      <button
        type="button"
        onClick={forceReveal}
        disabled={isForcingStage}
        className="text-purple-700 underline font-bold disabled:opacity-50"
      >
        {isForcingStage ? "Opening Reveal..." : "Reveal Submitted Images"}
      </button>
    )}

    {isHost && isSubmissionTimeExpired && submissions.length === 0 && (
      <button
        type="button"
        onClick={nextRound}
        disabled={isAdvancing}
        className="text-purple-700 underline font-bold disabled:opacity-50"
      >
        {isAdvancing ? "Skipping..." : "Skip Empty Round"}
      </button>
    )}
  </>
)}
  </>
      ) : stage === "generating" ? (
  <div className="min-h-screen w-full bg-purple-700 flex flex-col items-center justify-center text-white">
    <div className="text-8xl mb-6 animate-bounce">
      👑
    </div>

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
  <>
    <div className="w-full max-w-3xl text-center space-y-3">

      <div className={`w-full max-w-2xl mx-auto rounded-3xl p-5 shadow-xl text-center ${
        selectedGameMode === "cards" ? "bg-black text-white" : "bg-white"
      }`}>
        <div className={`mb-2 font-bold tracking-wider ${
          selectedGameMode === "cards" ? "text-gray-300" : "text-purple-600"
        }`}>
          {selectedGameMode === "cards" ? "🃏 FILL IN THE BLANK" : "🎯 ROUND PROMPT"}
        </div>

        <h2 className="text-3xl font-black">
          {roundPrompt}
        </h2>

        {votingTimeRemainingSeconds !== null && (
          <p className="mt-4 text-lg font-extrabold">
            {isVotingTimeExpired
              ? "Voting time is up — waiting for the host"
              : `Vote now: ${formatCountdown(votingTimeRemainingSeconds)}`}
          </p>
        )}
      </div>

      {voteMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl">
          {voteMessage}
        </div>
      )}

      {isHost && (
        <button
          type="button"
          onClick={endVotingEarly}
          disabled={isForcingStage}
          className="bg-purple-700 text-white px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
        >
          {isForcingStage ? "Calculating Winner..." : "End Voting & Reveal Winner"}
        </button>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-5xl">
      {submissions.map((item, index) => {
        const [text, imageUrl, playerName] = item.split("|||");

        return (
          <div
            key={index}
            onClick={() => voteForSubmission(text, playerName)}
            className={`rounded-2xl border shadow-lg overflow-hidden cursor-pointer transition transform hover:scale-[1.02] ${
              hasVoted || isVotingTimeExpired
                ? "opacity-70 pointer-events-none"
                : "hover:shadow-2xl"
            }`}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt={text}
                className="w-full aspect-square object-cover bg-gray-100"
              />
            )}

            <div className="p-4 bg-white">
              <p className="font-bold text-xl text-center leading-relaxed mb-4">
                “{text}”
              </p>

              {!hasVoted && !isVotingTimeExpired ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    voteForSubmission(text, playerName);
                  }}
                  className="w-full bg-black text-white px-4 py-3 rounded-xl font-bold"
                >
                  Vote for This
                </button>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  {isVotingTimeExpired ? "Voting time is up" : "Vote locked in"}
                </p>
              )}

              {imageUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveImage(imageUrl, text);
                  }}
                  className="mt-3 w-full bg-purple-600 text-white px-4 py-2 rounded-xl"
                >
                  Save Image
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </>
/* =======================================
   WINNER SCREEN
======================================= */
) : stage === "winner" ? (
  <>
    <div className="w-full max-w-md bg-gradient-to-b from-purple-700 to-purple-950 text-white rounded-3xl p-6 text-center shadow-2xl border-4 border-yellow-300">
      <h2 className="text-4xl font-extrabold mb-4">
        {winnerImages.length > 1 ? "Tie Winners" : "Round Winner"}
      </h2>

      <div
        className={`grid gap-4 mb-5 ${
          winnerImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {winnerImages.map((imageUrl, index) => (
          <img
            key={index}
            src={imageUrl}
            alt="Winning image"
            className="w-full aspect-square object-cover rounded-2xl border-4 border-white shadow-xl"
          />
        ))}
      </div>

      <div className="relative bg-white text-black rounded-2xl p-4">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl">
          👑
        </div>

        <p className="text-3xl font-extrabold mt-4">
          {winnerName || "Calculating..."}
        </p>

        <p className="text-sm text-gray-500 mt-1">
          {winnerImages.length > 1 ? "tied for the round" : "won the round"}
        </p>

        <p className="mt-4 text-lg font-semibold">
          “{winnerPrompt || winner}”
        </p>
      </div>
    </div>

    <div className="bg-white border-4 border-purple-300 rounded-3xl p-5 w-full max-w-md shadow-xl">
      <h3 className="text-3xl font-extrabold text-center mb-4">
        Scoreboard
      </h3>

      <div className="flex flex-col gap-3">
       {scoreboardPlayers.map((player, index) => (
      <div
        key={player.name}
        className={`flex justify-between items-center rounded-2xl px-4 py-3 font-bold ${
        index === 0
        ? "bg-yellow-100 border-2 border-yellow-400 text-yellow-900"
        : "bg-purple-100 text-purple-900"
        }`}
      >
        <div className="flex items-center gap-3">
          {player.avatar_url && (
          <img
          src={player.avatar_url}
          alt={player.name}
          className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
        )}

      <span>
        {index === 0 ? "👑 " : ""}
        {player.name}
      </span>
    </div>

    <span>{player.points ?? 0}</span>
  </div>
))}
      </div>
    </div>

    {finalWinner && (
  <div className="border-4 border-yellow-400 rounded-3xl p-5 max-w-4xl text-center bg-yellow-100 shadow-xl">
    <h3 className="text-3xl font-extrabold">🎉 Final Winner</h3>
    <p className="text-xl font-bold mt-2">{finalWinner}</p>

    <div className="mt-8">
      <h4 className="text-2xl font-extrabold mb-4">
        🏆 Round History
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roundHistory.map((round) => (
          <div
            key={round.id}
            className="bg-white rounded-2xl p-3 shadow text-black"
          >
            <p className="font-bold mb-2">
              Round {round.round_number}
            </p>

            {round.winner_image_url && (
              <img
                src={round.winner_image_url}
                alt={round.winner_prompt}
                className="w-full rounded-xl mb-2"
              />
            )}

            <p className="font-bold">
              👑 {round.winner_name}
            </p>

            <p className="text-sm text-gray-600">
              "{round.winner_prompt}"
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

    {finalWinner && isHost && (
      <button
        type="button"
        onClick={playAgain}
        disabled={isPlayingAgain}
        className="bg-green-600 text-white px-8 py-4 rounded-2xl disabled:opacity-50 font-extrabold shadow-lg"
      >
        {isPlayingAgain ? "Resetting Game..." : "Play Again"}
      </button>
    )}

    {finalWinner && !isHost && (
      <p className="text-gray-500 text-center">
        Waiting for {hostName || "the host"} to start a rematch...
      </p>
    )}

    {!finalWinner && isHost && (
  <button
    onClick={nextRound}
    disabled={isAdvancing}
    className="bg-purple-600 text-white px-8 py-4 rounded-2xl disabled:opacity-50 font-extrabold shadow-lg"
  >
    {isAdvancing ? "Starting..." : "Next Round"}
  </button>
)}

{!finalWinner && !isHost && (
  <p className="text-gray-500 text-center">
    Waiting for {hostName || "the host"} to start the next round...
  </p>
)}
  </>
) : (
  <p>Unknown game stage.</p>
)}
</main>
  );
}
