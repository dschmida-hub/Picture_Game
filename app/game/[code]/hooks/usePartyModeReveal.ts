import { useEffect, useState } from "react";
import { PARTY_MODE_SECONDS_PER_IMAGE } from "../utils/gameRoomUtils";

export function usePartyModeReveal({
  isPartyMode,
  revealStartedAt,
  submissionCount,
}: {
  isPartyMode: boolean;
  revealStartedAt: string | null;
  submissionCount: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isPartyMode || !revealStartedAt) return;

    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [isPartyMode, revealStartedAt]);

  if (!isPartyMode || !revealStartedAt || submissionCount === 0) {
    return { isSequenceActive: false, currentImageIndex: 0, secondsRemainingForImage: 0 };
  }

  const elapsedSeconds = Math.max(0, (now - new Date(revealStartedAt).getTime()) / 1000);
  const totalSequenceSeconds = submissionCount * PARTY_MODE_SECONDS_PER_IMAGE;
  const isSequenceActive = elapsedSeconds < totalSequenceSeconds;
  const currentImageIndex = Math.min(
    submissionCount - 1,
    Math.floor(elapsedSeconds / PARTY_MODE_SECONDS_PER_IMAGE)
  );
  const secondsRemainingForImage = Math.max(
    0,
    PARTY_MODE_SECONDS_PER_IMAGE - (elapsedSeconds % PARTY_MODE_SECONDS_PER_IMAGE)
  );

  return { isSequenceActive, currentImageIndex, secondsRemainingForImage };
}
