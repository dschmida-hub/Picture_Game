import { describe, expect, it } from "vitest";
import { secondsUntil } from "./useRoundCountdowns";

describe("secondsUntil", () => {
  it("returns null when there's no deadline", () => {
    expect(secondsUntil(null, Date.now())).toBeNull();
  });

  it("returns null before the clock has ticked (currentTime <= 0)", () => {
    expect(secondsUntil(new Date().toISOString(), 0)).toBeNull();
  });

  it("rounds up the remaining seconds", () => {
    const now = Date.now();
    const deadline = new Date(now + 10_400).toISOString();
    expect(secondsUntil(deadline, now)).toBe(11);
  });

  it("floors at zero once the deadline has passed", () => {
    const now = Date.now();
    const deadline = new Date(now - 5_000).toISOString();
    expect(secondsUntil(deadline, now)).toBe(0);
  });
});
