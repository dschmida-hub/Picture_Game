"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type  GameStage = "lobby" | "submitting" | "reveal" | "winner";

export default function GameRoom() {
  const params = useParams();
  const code = params.code as string;

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const [stage, setStage] = useState<GameStage>("lobby");
  const [submission, setSubmission] = useState("");
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [winner, setWinner] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [scoreboard, setScoreboard] = useState<string[]>([]);
  const [finalWinner, setFinalWinner] = useState("");

  const roundPrompt = "Worst thing to bring to a wedding";

  async function loadPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("name ,points")
    .eq("room_code", code)
    .order("points", { ascending: false })
    ;

  if (error) {
    console.error(error);
    return;
  }

  setPlayers(data.map((player) => `${player.name} - ${player.points} pts`));
}

async function loadSubmissions() {
  const { data, error } = await supabase
    .from("submissions")
    .select("player_name, prompt")
    .eq("room_code", code)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setSubmissions(data.map((item) => `${item.player_name}: ${item.prompt}`));
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
  const { error } = await supabase.from("games").insert([
    {
      room_code: code,
      stage: "submitting",
      prompt: roundPrompt,
    },
  ]);

  if (error) {
    console.error(error);
    alert("Failed to start game");
    return;
  }

  setStage("submitting");
}

  async function submitPrompt() {
  if (!submission.trim()) return;

  const { error } = await supabase.from("submissions").insert([
    {
      room_code: code,
      player_name: name,
      prompt: submission.trim(),
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
  .select("id")
  .eq("room_code", code);

if (
  allPlayers &&
  allSubmissions &&
  allSubmissions.length >= allPlayers.length
) {
  const { error: gameError } = await supabase
    .from("games")
    .update({ stage: "reveal" })
    .eq("room_code", code);

  if (gameError) {
    console.error(gameError);
    return;
  }

  setStage("reveal");
} else {
  alert("Prompt submitted. Waiting for everyone else.");
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
  await supabase
    .from("submissions")
    .delete()
    .eq("room_code", code);

  await supabase
    .from("votes")
    .delete()
    .eq("room_code", code);

  await supabase.from("games").insert([
    {
      room_code: code,
      stage: "submitting",
      prompt: roundPrompt,
      winner_awarded: false,
    },
  ]);

  setWinner("");
  setSubmissions([]);
  setStage("submitting");
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
              <div key={index} className="border rounded-xl p-3 text-center">
                {player}
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            className="bg-green-600 text-white px-6 py-3 rounded-xl"
          >
            Start Game
          </button>
        </>
      ) : stage === "submitting" ? (
        <>
          <h2 className="text-2xl font-bold">Round 1</h2>

          <div className="border rounded-xl p-4 max-w-md text-center">
            <p className="text-lg font-semibold">{roundPrompt}</p>
          </div>

          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            placeholder="Write your AI image prompt..."
            className="border rounded-xl p-4 w-full max-w-md min-h-32"
          />

          <button
            onClick={submitPrompt}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl"
          >
            Submit Prompt
          </button>
        </>
      ) : stage === "reveal" ? (
     <>
    <h2 className="text-2xl font-bold">Vote for Winner</h2>

          <p className="font-semibold">{roundPrompt}</p>

          <div className="flex flex-col gap-3 w-full max-w-md">
            {submissions.map((item, index) => (
            <button
                key={index}
                onClick={() => voteForSubmission(item)}
                className="border rounded-xl p-4 text-left hover:bg-gray-100"
                >
                {item}
            </button>
        ))}
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
    className="bg-black text-white px-6 py-3 rounded-xl"
  >
    Next Round
  </button>
)}
  </>
)}
</main>
  );
}