"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GameStage = "lobby" | "submitting" | "generating" | "reveal" | "winner";

export default function GameRoom() {
  const params = useParams();
  const code = params.code as string;

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  type Player = {
  name: string;
  points: number;
  avatar_url: string | null;
  avatar_description?: string |null;
};

  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<GameStage>("lobby");
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
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");
  const [winnerImageUrl, setWinnerImageUrl] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [winnerPrompt, setWinnerPrompt] = useState("");
  const [winnerImages, setWinnerImages] = useState<string[]>([]);
  const hostName = players[0]?.name;
  const isHost = joined && name === hostName;
  const [roundHistory, setRoundHistory] = useState<any[]>([]);
  const hasSubmitted = submissions.some((item) => {
  const parts = item.split("|||");
  const playerName = parts[2];
  return playerName === name;
});

  const loadingMessages = [
  "Teaching raccoons wedding etiquette...",
  "Negotiating with angry alligators...",
  "Adding unnecessary explosions...",
  "Convincing the bride this is normal...",
  "Searching for maximum chaos...",
  "Making the image 37% funnier...",
];

  const [roundPrompt, setRoundPrompt] = useState("");

async function loadRandomPrompt() {
  const { data, error } = await supabase
    .from("prompts")
    .select("prompt")
    .eq("active", true);

  if (error) {
    console.error(error);
    return "";
  }

  if (!data || data.length === 0) return "";

  const randomPrompt =
    data[Math.floor(Math.random() * data.length)].prompt;

  setRoundPrompt(randomPrompt);

  return randomPrompt;
}

  async function loadPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("name ,points, avatar_url, avatar_description")
    .eq("room_code", code)
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

async function loadSubmissions() {
  const { data, error } = await supabase
    .from("submissions")
    .select("player_name, prompt, image_url")
    .eq("room_code", code)
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
    .select("stage, prompt")
    .eq("room_code", code)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

 if (data) {
  setStage(data.stage as GameStage);
  setRoundPrompt(data.prompt);
}
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

    ]);

    setIsPageLoading(false);
  }

  loadInitialData();

  const interval = setInterval(() => {
  loadPlayers();
  loadGame();
  loadSubmissions();
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

  const { data: existingPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("room_code", code)
    .eq("name", cleanName)
    .maybeSingle();

  if (!existingPlayer) {
    const { error } = await supabase.from("players").insert([
      {
        name: cleanName,
        room_code: code,
        avatar_url: avatarUrl,
        avatar_description: avatarDescription,
        points: 0,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Failed to join room");
      return;
    }
  }

  await loadPlayers();
  setJoined(true);
  }finally {
  setIsJoining(false);
  }
}

async function startGame() {
   if (!isHost) return;
  if (isStarting) return;

  setIsStarting(true);

  try {
     let promptQuery = supabase
    .from("prompts")
    .select("prompt")
    .eq("active", true);

  if (selectedCategory !== "Random") {
    promptQuery = promptQuery.eq("category", selectedCategory);
  }

  const { data: prompts, error: promptError } = await promptQuery;

  if (promptError) {
    console.error(promptError);
    alert("Failed to load prompts");
    return;
  }

  if (!prompts?.length) {
    alert("No prompts found for this category");
    return;
  }

  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  const { error } = await supabase.from("games").insert([
    {
      room_code: code,
      stage: "submitting",
      prompt: randomPrompt.prompt,
      winner_awarded: false,
    },
  ]);

  if (error) {
    console.error(error);
    alert("Failed to start game");
    return;
  }

  setRoundPrompt(randomPrompt.prompt);
  setStage("submitting");
} finally {
    setIsStarting(false);
  }
}
 async function submitPrompt() {
  if (!submission.trim()) return;
  if (isSubmitting || hasSubmitted) return;
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

Bright colorful cartoon style
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
        player_name: name,
        prompt: submission.trim(),
        image_url: imageData.imageUrl,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Failed to submit prompt");
      return;
    }

    setSubmission("");
    await loadSubmissions();

    const { data: allPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("room_code", code);

    const { data: allSubmissions } = await supabase
      .from("submissions")
      .select("id, image_url")
      .eq("room_code", code);

    const everyoneSubmitted =
      allPlayers &&
      allSubmissions &&
      allSubmissions.length >= allPlayers.length;

    const allImagesReady =
      allSubmissions &&
      allSubmissions.every((item) => item.image_url);

    if (everyoneSubmitted && allImagesReady) {
      const { error: gameError } = await supabase
        .from("games")
        .update({ stage: "reveal" })
        .eq("room_code", code);

      if (gameError) {
        console.error(gameError);
        return;
      }

      setStage("reveal");
    }
  } finally {
    setIsSubmitting(false);
  }
}

async function voteForSubmission(answerText: string, playerName: string) {
  if (hasVoted) return;

  const voteValue = `${playerName}: ${answerText}`;

  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("room_code", code)
    .eq("voter_name", name)
    .maybeSingle();

  if (existingVote) return;

  setHasVoted(true);

  const { error } = await supabase.from("votes").insert([
    {
      room_code: code,
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
    .eq("room_code", code);

  const { data: allVotes } = await supabase
    .from("votes")
    .select("id")
    .eq("room_code", code);

  if (allSubmissions && allVotes && allVotes.length >= allSubmissions.length) {
  const { error: stageError } = await supabase
  .from("games")
  .update({ stage: "winner" })
  .eq("room_code", code);

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

async function loadWinner() {
  const { data, error } = await supabase
    .from("votes")
    .select("voted_for")
    .eq("room_code", code);

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

  for (const winningSubmission of tiedSubmissions) {
    const playerName = winningSubmission.split(":")[0].trim();

    const promptText = winningSubmission
      .split(":")
      .slice(1)
      .join(":")
      .trim();

    const { data: submissionData, error: submissionError } = await supabase
      .from("submissions")
      .select("image_url")
      .eq("room_code", code)
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
  .eq("room_code", code)
  .order("id", { ascending: false })
  .limit(1)
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
        round_number: roundHistory.length + 1,
        winner_name: playerName,
        winner_prompt: promptText,
        winner_image_url: winningImages[imageIndex] || null,
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
}

async function nextRound() {

  const { data: currentPlayers } = await supabase
  .from("players")
  .select("name, points")
  .eq("room_code", code);

  const gameWinner = currentPlayers?.find(
  (player) => (player.points ?? 0) >= 3
  );

if (gameWinner) {
  setFinalWinner(`${gameWinner.name} wins the game!`);
  return;
}
  if (!isHost) return;
  if (isAdvancing) return;

  setIsAdvancing(true);

  try {
    const newPrompt = await loadRandomPrompt();

    await supabase.from("submissions").delete().eq("room_code", code);
    await supabase.from("votes").delete().eq("room_code", code);

    await supabase
      .from("games")
      .update({
        stage: "submitting",
        prompt: newPrompt,
        winner_awarded: false,
      })
      .eq("room_code", code);

    setHasVoted(false);
    setVoteMessage("");
    setSubmission("");
    setSubmissions([]);
    setWinner("");
    setPointsAwarded(false);
  } finally {
    setIsAdvancing(false);
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

  <p className="text-xs text-gray-400 mt-2">
    Room {code}
  </p>
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
          <h2 className="text-2xl font-bold">Lobby</h2>

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
    {index === 0 && (
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
    <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="border p-3 rounded-xl"
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
    {isHost ? (
  <button
    onClick={startGame}
    disabled={isStarting}
    className="bg-green-600 text-white px-6 py-3 rounded-xl"
  >
    {isStarting ? "Starting..." : "Start Game"}
  </button>
) : (
  <p className="text-gray-500 text-center">
    Waiting for {hostName || "the host"} to start the game...
  </p>
)}
</>
) : stage === "submitting" ? (
  <>
    <h2 className="text-2xl font-bold">Round 1</h2>

    <div className="w-full max-w-2xl rounded-3xl p-5 bg-white shadow-xl text-center">
  <div className="mb-3 text-purple-600 font-bold tracking-wider">
    🎯 ROUND PROMPT
  </div>

  <h2 className="text-3xl font-black">
   {roundPrompt}
  </h2>
</div>

    {hasSubmitted || isSubmitting ? (
  <div className="fixed inset-0 bg-purple-700 text-white flex flex-col items-center justify-center gap-5 z-50 p-6">
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
  </div>
) : (
      <>
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg p-5 border border-gray-200">
  <label className="block text-sm font-bold text-purple-600 mb-2">
    Your Answer
  </label>

  <textarea
    value={submission}
    onChange={(e) => setSubmission(e.target.value)}
    placeholder="Make your friends laugh..."
    maxLength={120}
    className="w-full border-2 border-purple-300 rounded-2xl p-4 text-lg min-h-40 resize-none focus:outline-none focus:border-purple-500"
  />

  <div className="flex justify-between items-center mt-2">
    <p className="text-sm text-gray-500">
      Think punchline, not paragraph.
    </p>

    <p className="text-sm text-gray-500">
      {submission.length}/120
    </p>
  </div>
</div>

<button
  onClick={submitPrompt}
  disabled={isSubmitting || !submission.trim()}
  className="bg-blue-600 text-white px-8 py-3 rounded-2xl disabled:opacity-50 font-bold shadow-lg"
>
  {isSubmitting ? "Submitting..." : "Lock In Answer"}
</button>
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

      <div className="w-full max-w-2xl mx-auto rounded-3xl p-5 bg-white shadow-xl text-center">
        <div className="mb-2 text-purple-600 font-bold tracking-wider">
          🎯 ROUND PROMPT
        </div>

        <h2 className="text-3xl font-black">
          {roundPrompt}
        </h2>
      </div>

      {voteMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl">
          {voteMessage}
        </div>
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
              hasVoted
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

              {!hasVoted ? (
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
                  Vote locked in
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