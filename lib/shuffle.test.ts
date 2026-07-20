import { describe, expect, it } from "vitest";
import { SEED_BANK } from "./seed-bank";
import { pickSession, shuffle, type Rng } from "./shuffle";
import type { Question } from "./types";

/** Deterministic rng so ordering assertions aren't flaky. */
function seeded(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const ids = (qs: Question[]) => qs.map((q) => q.id);

describe("shuffle", () => {
  it("does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input, seeded(1));
    expect(input).toEqual(copy);
  });

  it("preserves every member exactly once", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, seeded(42));
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("is deterministic for a given rng", () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)));
  });

  it("actually reorders", () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    expect(shuffle(input, seeded(3))).not.toEqual(input);
  });

  it("handles empty and single-item arrays", () => {
    expect(shuffle([], seeded(1))).toEqual([]);
    expect(shuffle(["only"], seeded(1))).toEqual(["only"]);
  });
});

describe("pickSession", () => {
  it("returns the requested count", () => {
    expect(pickSession(SEED_BANK, 5, seeded(1))).toHaveLength(5);
    expect(pickSession(SEED_BANK, 8, seeded(1))).toHaveLength(8);
    expect(pickSession(SEED_BANK, 12, seeded(1))).toHaveLength(12);
  });

  it("returns the whole bank for 'all'", () => {
    expect(pickSession(SEED_BANK, "all", seeded(1))).toHaveLength(SEED_BANK.length);
  });

  it("never repeats a question within a session", () => {
    const picked = ids(pickSession(SEED_BANK, 12, seeded(9)));
    expect(new Set(picked).size).toBe(picked.length);
  });

  it("clamps when the count exceeds the bank", () => {
    const tiny = SEED_BANK.slice(0, 3);
    expect(pickSession(tiny, 12, seeded(1))).toHaveLength(3);
  });

  it("does not mutate the bank", () => {
    const before = ids([...SEED_BANK]);
    pickSession(SEED_BANK, 5, seeded(2));
    expect(ids([...SEED_BANK])).toEqual(before);
  });

  it("keeps nostory questions in the draw", () => {
    // They stay in by design (specs.md §2) — the amber flag only means something if
    // they can come up, and skipping them is what feeds the weakest-stories ranking.
    const everything = pickSession(SEED_BANK, "all", seeded(4));
    expect(everything.filter((q) => q.nostory)).toHaveLength(4);
  });
});

describe("seed bank integrity", () => {
  it("has unique ids", () => {
    const all = ids(SEED_BANK);
    expect(new Set(all).size).toBe(all.length);
  });

  it("marks exactly the three nostar questions from specs.md §3", () => {
    expect(ids(SEED_BANK.filter((q) => q.nostar)).sort()).toEqual([
      "great-support",
      "problem-process",
      "why-dust",
    ]);
  });

  it("gives every question canonical wording and a hint", () => {
    for (const q of SEED_BANK) {
      expect(q.q.trim()).not.toBe("");
      expect(q.hint.trim()).not.toBe("");
    }
  });
});
