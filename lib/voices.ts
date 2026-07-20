/** Voice ranking for the browser speechSynthesis picker — specs.md §4. */

function score(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("natural")) return 0;
  if (n.includes("google")) return 1;
  if (n.includes("premium") || n.includes("enhanced")) return 2;
  return 3;
}

export function rankEnglishVoices(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang?.toLowerCase().startsWith("en"))
    .sort((a, b) => score(a.name) - score(b.name) || a.name.localeCompare(b.name));
}
