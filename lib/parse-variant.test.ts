import { describe, expect, it } from "vitest";
import { cleanVariant } from "./parse-variant";

describe("cleanVariant", () => {
  it("strips wrapping straight quotes", () => {
    expect(cleanVariant('"Walk me through a time you failed."')).toBe(
      "Walk me through a time you failed.",
    );
  });

  it("strips wrapping curly quotes", () => {
    expect(cleanVariant("“Walk me through a time you failed.”")).toBe(
      "Walk me through a time you failed.",
    );
  });

  it("trims whitespace outside and inside the quotes", () => {
    expect(cleanVariant('  " Walk me through it. "\n')).toBe("Walk me through it.");
  });

  it("leaves an unquoted question untouched", () => {
    expect(cleanVariant("Walk me through a time you failed.")).toBe(
      "Walk me through a time you failed.",
    );
  });

  it("keeps quotes inside the question", () => {
    const q = 'When did a customer say "this is unacceptable" — what did you do?';
    expect(cleanVariant(q)).toBe(q);
    expect(cleanVariant(`"${q}"`)).toBe(q);
  });

  it("leaves an unmatched leading quote alone", () => {
    expect(cleanVariant('"Walk me through it.')).toBe('"Walk me through it.');
  });

  it("survives empty and one-character input", () => {
    expect(cleanVariant("")).toBe("");
    expect(cleanVariant('"')).toBe('"');
  });
});
