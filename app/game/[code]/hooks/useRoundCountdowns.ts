import { useEffect, useState } from "react";

type GameStage = "lobby" | "submitting" | "generating" | "reveal" | "winner";

function secondsUntil(deadline: string | null, currentTime: number) {
  if (!deadline || currentTime <= 0) return null;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - currentTime) / 1000));
}

export function useRoundCountdowns({
  roundDeadline,
  stage,
  votingDeadline,
}: {
  roundDeadline: string | null;
  stage: GameStage;
  votingDeadline: string | null;
}) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const activeDeadline = stage === "submitting" ? roundDeadline : stage === "reveal" ? votingDeadline : null;
    if (!activeDeadline) return;

    const initialTick = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, [roundDeadline, stage, votingDeadline]);

  const timeRemainingSeconds = secondsUntil(roundDeadline, currentTime);
  const votingTimeRemainingSeconds = secondsUntil(votingDeadline, currentTime);

  return {
    isSubmissionTimeExpired: timeRemainingSeconds === 0,
    isVotingTimeExpired: votingTimeRemainingSeconds === 0,
    timeRemainingSeconds,
    votingTimeRemainingSeconds,
  };
}
