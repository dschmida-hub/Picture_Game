import { describe, expect, it } from "vitest";
import {
  arePlayerNamesEqual,
  formatCountdown,
  getContentRatingLabel,
  getGameModeLabel,
  getImageStyleLabel,
  getPromptRatingTable,
  getRoomRetentionMessage,
  isPromptAllowedForContentRating,
  normalizeContentRating,
  normalizeImageStyle,
  normalizePlayerName,
  pickBestRatedPromptDeck,
  resolveImageStyle,
  type PromptOption,
} from "./gameRoomUtils";

describe("normalizeImageStyle", () => {
  it("defaults to clay_animation when nothing is given", () => {
    expect(normalizeImageStyle(null)).toBe("clay_animation");
    expect(normalizeImageStyle(undefined)).toBe("clay_animation");
    expect(normalizeImageStyle("")).toBe("clay_animation");
  });

  it("normalizes casing, punctuation, and spacing", () => {
    expect(normalizeImageStyle("  Comic Book  ")).toBe("comic_book");
    expect(normalizeImageStyle("Children's Picture Book")).toBe("childrens_picture_book");
  });

  it("maps known aliases to their canonical style", () => {
    expect(normalizeImageStyle("Claymation")).toBe("clay_animation");
    expect(normalizeImageStyle("Colorful Cartoon")).toBe("cartoon");
    expect(normalizeImageStyle("Lego")).toBe("lego_stop_motion");
    expect(normalizeImageStyle("Renaissance")).toBe("renaissance_painting");
  });

  it("passes through an already-canonical style untouched", () => {
    expect(normalizeImageStyle("pixel_art")).toBe("pixel_art");
  });
});

describe("resolveImageStyle", () => {
  it("uses the prompt's own style when the player picked 'prompt'", () => {
    expect(resolveImageStyle("comic_book", "prompt")).toBe("comic_book");
  });

  it("falls back to clay_animation when the prompt has no style", () => {
    expect(resolveImageStyle(null, "prompt")).toBe("clay_animation");
  });

  it("uses the player's own selection when it isn't 'prompt'", () => {
    expect(resolveImageStyle("comic_book", "pixel_art")).toBe("pixel_art");
  });
});

describe("normalizeContentRating", () => {
  it("only recognizes the literal 'pg13' value", () => {
    expect(normalizeContentRating("pg13")).toBe("pg13");
    expect(normalizeContentRating("everyone")).toBe("everyone");
    expect(normalizeContentRating(null)).toBe("everyone");
    expect(normalizeContentRating("PG13")).toBe("everyone");
  });
});

describe("isPromptAllowedForContentRating", () => {
  it("allows anything under pg13", () => {
    expect(isPromptAllowedForContentRating("a drunk toilet fart", "pg13")).toBe(true);
  });

  it("blocks flagged words under everyone", () => {
    expect(isPromptAllowedForContentRating("a drunk uncle at the wedding", "everyone")).toBe(false);
    expect(isPromptAllowedForContentRating("the toilet overflowed", "everyone")).toBe(false);
  });

  it("allows clean prompts under everyone", () => {
    expect(isPromptAllowedForContentRating("a dog wearing a tiny hat", "everyone")).toBe(true);
  });

  it("matches flagged words as whole words only", () => {
    expect(isPromptAllowedForContentRating("an assortment of fruit", "everyone")).toBe(true);
  });
});

describe("getContentRatingLabel", () => {
  it("labels pg13 and everyone distinctly", () => {
    expect(getContentRatingLabel("pg13")).toBe("PG-13");
    expect(getContentRatingLabel("everyone")).toBe("Everyone");
  });
});

describe("formatCountdown", () => {
  it("formats whole minutes", () => {
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(120)).toBe("2:00");
  });

  it("pads seconds under 10", () => {
    expect(formatCountdown(65)).toBe("1:05");
  });

  it("handles zero", () => {
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("handles under a minute", () => {
    expect(formatCountdown(45)).toBe("0:45");
  });
});

describe("getImageStyleLabel", () => {
  it("returns the friendly label for a known style", () => {
    expect(getImageStyleLabel("clay_animation")).toBe("Clay Animation");
    expect(getImageStyleLabel("lego_stop_motion")).toBe("LEGO Stop-Motion");
  });

  it("normalizes before labeling", () => {
    expect(getImageStyleLabel("Claymation")).toBe("Clay Animation");
  });

  it("title-cases an unknown style as a fallback", () => {
    expect(getImageStyleLabel("mystery_style")).toBe("Mystery Style");
  });
});

describe("pickBestRatedPromptDeck", () => {
  const prompt = (rating: PromptOption["rating"], id: number): PromptOption => ({
    id,
    prompt: `prompt ${id}`,
    image_style: null,
    source: "classic",
    rating,
  });

  it("prefers 'good' prompts when any exist", () => {
    const prompts = [prompt("bad", 1), prompt("good", 2), prompt("ehhh", 3)];
    expect(pickBestRatedPromptDeck(prompts)).toEqual([prompt("good", 2)]);
  });

  it("falls back to 'ehhh' prompts when there are no 'good' ones", () => {
    const prompts = [prompt("bad", 1), prompt("ehhh", 2)];
    expect(pickBestRatedPromptDeck(prompts)).toEqual([prompt("ehhh", 2)]);
  });

  it("falls back to the full deck when nothing is rated well", () => {
    const prompts = [prompt("bad", 1), prompt("bad", 2)];
    expect(pickBestRatedPromptDeck(prompts)).toEqual(prompts);
  });
});

describe("getPromptRatingTable", () => {
  it("maps each game mode to its own ratings table", () => {
    expect(getPromptRatingTable("classic")).toBe("prompts");
    expect(getPromptRatingTable("cards")).toBe("cah_prompts");
    expect(getPromptRatingTable("most_likely_to")).toBe("most_likely_to_prompts");
  });

  it("returns null for anything else, including custom sources", () => {
    expect(getPromptRatingTable(null)).toBeNull();
    expect(getPromptRatingTable("custom_classic")).toBeNull();
  });
});

describe("getGameModeLabel", () => {
  it("labels every mode, defaulting unknowns to Classic", () => {
    expect(getGameModeLabel("cards")).toBe("Fill in the Blank");
    expect(getGameModeLabel("most_likely_to")).toBe("Most Likely To");
    expect(getGameModeLabel("classic")).toBe("Classic");
  });
});

describe("normalizePlayerName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizePlayerName("  Dave   Schmida  ")).toBe("Dave Schmida");
  });
});

describe("arePlayerNamesEqual", () => {
  it("is case-insensitive and whitespace-insensitive", () => {
    expect(arePlayerNamesEqual("Dave", "  dave ")).toBe(true);
    expect(arePlayerNamesEqual("Dave Schmida", "dave  schmida")).toBe(true);
  });

  it("treats genuinely different names as different", () => {
    expect(arePlayerNamesEqual("Dave", "David")).toBe(false);
  });
});

describe("getRoomRetentionMessage", () => {
  it("describes the real activity-based retention window", () => {
    expect(getRoomRetentionMessage()).toBe(
      "Inactive rooms are cleaned up after about a month, so you can pick this game night back up anytime."
    );
  });
});
