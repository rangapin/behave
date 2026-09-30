const OPENERS = `"'“‘`;
const CLOSERS = `"'”’`;

/**
 * The variant prompt shows the question in quotes, so the model hands its rephrasing
 * back in quotes too — every time, in practice. Strip one wrapping pair; quotes
 * inside the question are left alone.
 */
export function cleanVariant(raw: string): string {
  const s = raw.trim();
  if (s.length < 2) return s;

  const wrapped = OPENERS.includes(s[0]) && CLOSERS.includes(s[s.length - 1]);
  return wrapped ? s.slice(1, -1).trim() : s;
}
