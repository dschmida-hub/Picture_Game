import { describe, expect, it } from "vitest";
import { computePartyModeRevealState } from "./usePartyModeReveal";
import { PARTY_MODE_SECONDS_PER_IMAGE } from "../utils/gameRoomUtils";

describe("computePartyModeRevealState", () => {
  it("is inactive with no reveal start time", () => {
    expect(computePartyModeRevealState(Date.now(), null, 3)).toEqual({
      isSequenceActive: false,
      currentImageIndex: 0,
      secondsRemainingForImage: 0,
    });
  });

  it("is inactive with zero submissions", () => {
    expect(computePartyModeRevealState(Date.now(), new Date().toISOString(), 0)).toEqual({
      isSequenceActive: false,
      currentImageIndex: 0,
      secondsRemainingForImage: 0,
    });
  });

  it("shows the first image right at the start of the sequence", () => {
    const revealStartedAt = new Date(1_000_000).toISOString();
    const state = computePartyModeRevealState(1_000_000, revealStartedAt, 3);

    expect(state.isSequenceActive).toBe(true);
    expect(state.currentImageIndex).toBe(0);
    expect(state.secondsRemainingForImage).toBe(PARTY_MODE_SECONDS_PER_IMAGE);
  });

  it("advances to the next image once its window elapses", () => {
    const revealStartedAt = new Date(1_000_000).toISOString();
    const oneImageLater = 1_000_000 + PARTY_MODE_SECONDS_PER_IMAGE * 1000 + 500;
    const state = computePartyModeRevealState(oneImageLater, revealStartedAt, 3);

    expect(state.currentImageIndex).toBe(1);
    expect(state.isSequenceActive).toBe(true);
  });

  it("clamps the image index to the last submission instead of overflowing", () => {
    const revealStartedAt = new Date(1_000_000).toISOString();
    const wayPastTheEnd = 1_000_000 + PARTY_MODE_SECONDS_PER_IMAGE * 100 * 1000;
    const state = computePartyModeRevealState(wayPastTheEnd, revealStartedAt, 3);

    expect(state.currentImageIndex).toBe(2);
  });

  it("marks the sequence inactive once every image has had its turn", () => {
    const revealStartedAt = new Date(1_000_000).toISOString();
    const totalDurationMs = PARTY_MODE_SECONDS_PER_IMAGE * 3 * 1000;
    const state = computePartyModeRevealState(1_000_000 + totalDurationMs + 1, revealStartedAt, 3);

    expect(state.isSequenceActive).toBe(false);
  });

  it("never reports negative elapsed time if the clock reads before the start", () => {
    const revealStartedAt = new Date(1_000_000).toISOString();
    const state = computePartyModeRevealState(999_000, revealStartedAt, 3);

    expect(state.currentImageIndex).toBe(0);
    expect(state.secondsRemainingForImage).toBe(PARTY_MODE_SECONDS_PER_IMAGE);
  });
});
