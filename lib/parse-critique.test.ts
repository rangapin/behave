import { describe, expect, it } from "vitest";
import {
  FALLBACK_FEEDBACK,
  clampGradeToFlags,
  extractJson,
  parseCritique,
} from "./parse-critique";
import type { StarFlags } from "./types";

const STAR = { expectStar: true } as const;
const NOSTAR = { expectStar: false } as const;

const allTrue: StarFlags = { situation: true, task: true, action: true, result: true };

const wellFormed = JSON.stringify({
  star: allTrue,
  grade: "strong",
  feedback: ["point 1", "point 2", "point 3"],
  followup: "what would you do differently?",
});

describe("extractJson", () => {
  it("strips ```json fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips bare ``` fences", () => {
    expect(extractJson('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("drops prose wrapped around the object", () => {
    expect(extractJson('Here is the critique: {"a":1} hope that helps')).toBe('{"a":1}');
  });

  it("keeps nested objects intact by taking the outermost braces", () => {
    const nested = '{"star":{"situation":true},"grade":"weak"}';
    expect(extractJson(nested)).toBe(nested);
  });
});

describe("parseCritique — happy path", () => {
  it("parses a well-formed STAR critique", () => {
    const result = parseCritique(wellFormed, STAR);
    expect(result.star).toEqual(allTrue);
    expect(result.grade).toBe("strong");
    expect(result.feedback).toHaveLength(3);
    expect(result.followup).toBe("what would you do differently?");
    expect(result.degraded).toBeUndefined();
  });

  it("parses through markdown fences the model was told not to use", () => {
    const result = parseCritique("```json\n" + wellFormed + "\n```", STAR);
    expect(result.grade).toBe("strong");
    expect(result.feedback).toHaveLength(3);
  });
});

describe("parseCritique — fallback path", () => {
  it.each([
    ["malformed JSON", "{not json at all"],
    ["empty string", ""],
    ["whitespace only", "   \n  "],
    ["a JSON array", "[1,2,3]"],
    ["JSON null", "null"],
    ["an object with no feedback", '{"grade":"weak"}'],
    ["feedback present but empty", '{"feedback":[]}'],
    ["feedback of the wrong type", '{"feedback":"just a string"}'],
    ["feedback entries that are all blank", '{"feedback":["  ",""]}'],
  ])("falls back on %s", (_label, raw) => {
    const result = parseCritique(raw, STAR);
    expect(result.degraded).toBe(true);
    expect(result.feedback).toEqual([FALLBACK_FEEDBACK]);
  });
});

describe("parseCritique — partial parse", () => {
  it("keeps feedback and drops the chips when star is malformed", () => {
    const raw = JSON.stringify({
      star: { situation: true, task: "yes", action: true, result: false },
      grade: "weak",
      feedback: ["you never said what you personally did"],
    });
    const result = parseCritique(raw, STAR);
    expect(result.star).toBeUndefined();
    expect(result.grade).toBeUndefined();
    expect(result.feedback).toEqual(["you never said what you personally did"]);
    expect(result.degraded).toBeUndefined();
  });

  it("keeps feedback when star is absent entirely", () => {
    const result = parseCritique('{"feedback":["too vague"]}', STAR);
    expect(result.star).toBeUndefined();
    expect(result.feedback).toEqual(["too vague"]);
  });

  it("derives a grade from valid flags when grade is missing", () => {
    const raw = JSON.stringify({
      star: { situation: true, task: true, action: true, result: false },
      feedback: ["no measurable outcome"],
    });
    expect(parseCritique(raw, STAR).grade).toBe("adequate");
  });

  it("will not derive 'strong' when the grade is missing, even on a full house", () => {
    // Content quality is precisely the judgement we lost, so we decline to award it.
    const raw = JSON.stringify({ star: allTrue, feedback: ["clean answer"] });
    expect(parseCritique(raw, STAR).grade).toBe("adequate");
  });

  it("drops non-string feedback entries but keeps the valid ones", () => {
    const raw = '{"feedback":["real point", 42, null, "another"]}';
    expect(parseCritique(raw, STAR).feedback).toEqual(["real point", "another"]);
  });

  it("treats a blank followup as absent", () => {
    const raw = '{"feedback":["a point"],"followup":"   "}';
    expect(parseCritique(raw, STAR).followup).toBeUndefined();
  });
});

describe("parseCritique — nostar questions", () => {
  it("ignores star and grade even when the model volunteers them", () => {
    const result = parseCritique(wellFormed, NOSTAR);
    expect(result.star).toBeUndefined();
    expect(result.grade).toBeUndefined();
    expect(result.feedback).toHaveLength(3);
    expect(result.followup).toBe("what would you do differently?");
  });
});

describe("clampGradeToFlags", () => {
  it("caps a flattering grade at what the flags allow", () => {
    const oneMissing: StarFlags = { ...allTrue, result: false };
    expect(clampGradeToFlags("strong", oneMissing)).toBe("adequate");

    const twoMissing: StarFlags = { ...allTrue, result: false, task: false };
    expect(clampGradeToFlags("strong", twoMissing)).toBe("weak");
  });

  it("lets the model grade below the ceiling", () => {
    expect(clampGradeToFlags("adequate", allTrue)).toBe("adequate");
    expect(clampGradeToFlags("weak", { ...allTrue, result: false })).toBe("weak");
  });

  it("leaves a legitimately strong answer alone", () => {
    expect(clampGradeToFlags("strong", allTrue)).toBe("strong");
  });

  it("clamps through parseCritique — a fluent answer with no Result is not strong", () => {
    const raw = JSON.stringify({
      star: { situation: true, task: true, action: true, result: false },
      grade: "strong",
      feedback: ["sounded confident, but you never said what changed"],
    });
    expect(parseCritique(raw, STAR).grade).toBe("adequate");
  });
});
