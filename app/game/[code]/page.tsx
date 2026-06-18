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
};

  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<GameStage>("lobby");
  const [submission, setSubmission] = useState("");
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [winner, setWinner] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [scoreboard, setScoreboard] = useState<string[]>([]);
  const [finalWinner, setFinalWinner] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Generating chaos...");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Random");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const hasSubmitted = submissions.some((item) =>
    item.startsWith(`${name}:`)
  );

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
    .select("name ,points, avatar_url")
    .eq("room_code", code)
    .order("points", { ascending: false })
    ;

  if (error) {
    console.error(error);
    return;
  }

  setPlayers(data);
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

  setSubmissions(data.map((item) => `${item.player_name}: ${item.prompt}|||${item.image_url}`));
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
  loadPlayers();
  loadGame();
  loadSubmissions();
  loadWinner();
  loadScoreboard();
  const interval = setInterval(() => {
    loadPlayers();
    loadGame();
    loadSubmissions();
    loadWinner();
    loadScoreboard();
  }, 2000);

  return () => clearInterval(interval);
}, []);

async function joinGame() {
  if (!name.trim()) return;

  const cleanName = name.trim();

  let avatarUrl = null;

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
  }

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
}

async function startGame() {
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

  setIsSubmitting(true);

  try {
    const imagePrompt = `
You are creating a hilarious party game image.

Question:
${roundPrompt}

Player Answer:
${submission.trim()}

The image should clearly show the connection between the question and answer.

The joke should be understandable without reading the answer.

Exaggerate facial expressions and reactions.

Rules:
- Make the scene absurd
- Exaggerate reactions
- Make it instantly understandable
- Bright colorful cartoon style
- No text in image
- Focus on visual comedy
- Make players laugh within 3 seconds
`;

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

async function voteForSubmission(item: string) {
  const { error } = await supabase.from("votes").insert([
    {
      room_code: code,
      voter_name: name,
      voted_for: item,
    },
  ]);

  if (error) {
    console.error(error);
    alert("Failed to vote");
    return;
  }

  const { data: allPlayers } = await supabase
    .from("players")
    .select("id")
    .eq("room_code", code);

  const { data: allVotes } = await supabase
    .from("votes")
    .select("id")
    .eq("room_code", code);

  if (allPlayers && allVotes && allVotes.length >= allPlayers.length) {
    await supabase
      .from("games")
      .update({ stage: "winner" })
      .eq("room_code", code);

    setStage("winner");
  } else {
    alert("Vote submitted. Waiting for everyone else.");
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

  let topSubmission = "";
  let topVotes = 0;

  Object.entries(voteCounts).forEach(([submission, count]) => {
    if (count > topVotes) {
      topSubmission = submission;
      topVotes = count;
    }
  });

  if (!topSubmission) return;

  const winnerName = topSubmission.split(":")[0].trim();

  const { data: gameData } = await supabase
  .from("games")
  .select("winner_awarded")
  .eq("room_code", code)
  .order("id", { ascending: false })
  .limit(1)
  .maybeSingle();

if (!gameData?.winner_awarded) {
  await supabase.rpc("award_winner_once", {
    player_name_input: winnerName,
    room_code_input: code,
  });
}

  setPointsAwarded(true);

  setWinner(`${topSubmission} (${topVotes} vote${topVotes === 1 ? "" : "s"})`);
  await loadPlayers();
}

async function nextRound() {
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

    setWinner("");
    setSubmissions([]);
    setRoundPrompt(newPrompt);
    setStage("submitting");
  } finally {
    setIsAdvancing(false);
  }
}


async function loadScoreboard() {
  const { data, error } = await supabase
    .from("players")
    .select("name, points")
    .eq("room_code", code)
    .order("points", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setScoreboard(data.map((player) => `${player.name} - ${player.points} pts`));

  const leader = data[0];

  if (leader && leader.points >= 3) {
    setFinalWinner(`${leader.name} wins the game with ${leader.points} points!`);
  }
}

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold">Room {code}</h1>

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
      className="bg-black text-white px-6 py-3 rounded-xl"
    >
      Join Room
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
        <div className="font-bold">{player.name}</div>
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
       <option value="General">🎉 General</option>
       <option value="Personal">👥 Personal</option>
       <option value="Work">💼 Work</option>
       <option value="Dating">❤️ Dating</option>
       <option value="Absurd">🤪 Absurd</option>
    </select>
    <button
      onClick={startGame}
      disabled={isStarting}
      className="bg-green-600 text-white px-6 py-3 rounded-xl"
    >
      {isStarting ? "Starting..." : "Start Game"}
    </button>
  </>
) : stage === "submitting" ? (
  <>
    <h2 className="text-2xl font-bold">Round 1</h2>

    <div className="border rounded-xl p-4 max-w-md text-center">
      <p className="text-lg font-semibold">{roundPrompt}</p>
    </div>

    {hasSubmitted || isSubmitting ? (
 <div className="fixed inset-0 bg-purple-700 text-white flex flex-col items-center justify-center space-y-6 z-50">
    <div className="text-7xl animate-bounce">👑</div>

    <h2 className="text-3xl font-bold">Cooking up your image...</h2>

    <p className="text-lg">
      {loadingMessage || "Adding maximum chaos..."}
    </p>

    <p className="text-sm opacity-80">
      {submissions.length} / {players.length} submitted
    </p>
  </div>
) : (
      <>
        <textarea
          value={submission}
          onChange={(e) => setSubmission(e.target.value)}
          placeholder="Write your AI image prompt..."
          className="border rounded-xl p-4 w-full max-w-md min-h-32"
        />

        <button
          onClick={submitPrompt}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Prompt"}
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
    ) :stage === "reveal" ? (
     <>
    <h2 className="text-2xl font-bold">Vote for Winner</h2>

          <p className="font-semibold">{roundPrompt}</p>

          <div className="flex flex-col gap-3 w-full max-w-md">
           {submissions.map((item, index) => {
  const [text, imageUrl] = item.split("|||");

     return (
        <button
         key={index}
        onClick={() => voteForSubmission(text)}
         className="border rounded-xl p-4 text-left hover:bg-gray-100"
     >
        {imageUrl && (
        <img
          src={imageUrl}
          alt={text}
          className="w-full rounded-xl mb-3"
        />
      )}

      <p className="font-bold">Submission #{index + 1}</p>
    </button>
  );
})}
          </div>

          <button
            onClick={() => setStage("submitting")}
            className="bg-black text-white px-6 py-3 rounded-xl"
          >
            Next Round
          </button>
        </>
    ) : (
    <>
    <h2 className="text-2xl font-bold">🏆 Winner</h2>
<p className="border rounded-xl p-4 max-w-md text-center">
  {winner || "Calculating winner..."}
</p>
<div className="border rounded-xl p-4 w-full max-w-md">
  <h3 className="text-xl font-bold text-center mb-3">Scoreboard</h3>

  <div className="flex flex-col gap-2">
    {scoreboard.map((score, index) => (
      <div key={index} className="text-center">
        {score}
      </div>
    ))}
  </div>
</div>

{finalWinner && (
  <div className="border rounded-xl p-4 max-w-md text-center bg-yellow-100">
    <h3 className="text-2xl font-bold">🎉 Final Winner</h3>
    <p>{finalWinner}</p>
  </div>
)}
{!finalWinner && (
  <button
  onClick={nextRound}
   disabled={isAdvancing}
  className="bg-purple-600 text-white px-6 py-3 rounded-xl disabled:opacity-50"
>
  {isAdvancing ? "Starting..." : "Next Round"}
</button>
)}
  </>
)}
</main>
  );
}