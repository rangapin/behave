import { describe, expect, it } from "vitest";
import { weakestStories } from "./summary";
import type { Attempt } from "./types";

/** A minimal attempt — only the fields weakestStories reads matter here. */
function attempt(over: Partial<Attempt>): Attempt {
  return {
    questionId: "q",
    askedWording: "",
    timestamp: 0,
    timeUsedSec: 0,
    overtime: false,
    transcript: "",
    feedback: [],
    ...over,
  };
}

describe("weakestStories", () => {
  it("returns nothing when every answer was in time and unskipped", () => {
    const history = [attempt({ questionId: "a" }), attempt({ questionId: "b" })];
    expect(weakestStories(history)).toEqual([]);
  });

  it("scores skips and overtimes together and ranks highest first", () => {
    const history = [
      attempt({ questionId: "a", skipped: true }),
      attempt({ questionId: "a", overtime: true }),
      attempt({ questionId: "b", overtime: true }),
      attempt({ questionId: "c" }), // clean — dropped
    ];
    const ranked = weakestStories(history);
    expect(ranked.map((r) => r.questionId)).toEqual(["a", "b"]);
    expect(ranked[0]).toMatchObject({ skips: 1, overtimes: 1, score: 2 });
  });

  it("honors the limit", () => {
    const history = [
      attempt({ questionId: "a", skipped: true }),
      attempt({ questionId: "b", skipped: true }),
      attempt({ questionId: "c", skipped: true }),
    ];
    expect(weakestStories(history, 2)).toHaveLength(2);
  });
});
