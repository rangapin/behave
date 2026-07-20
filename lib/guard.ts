/**
 * Route guard — specs.md §3.
 *
 * Not auth. The secret is NEXT_PUBLIC_ and therefore visible to anyone with
 * devtools; that is understood and accepted. It stops crawlers and drive-by use
 * of a public Vercel URL, and nothing more. The rate cap is per serverless
 * instance and so is leaky by design — real limiting would need a KV store,
 * which this project doesn't want.
 */

import { SECRET_HEADER } from "./constants";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

let hits: number[] = [];

function underRateCap(): boolean {
  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return false;
  hits.push(now);
  return true;
}

/** Returns a Response to short-circuit with, or null when the request may proceed. */
export function guard(req: Request): Response | null {
  const expected = process.env.NEXT_PUBLIC_SURFACE_SECRET;

  // An unset secret fails closed. A misconfigured deploy should refuse to
  // proxy paid API calls, not silently serve them to the open internet.
  if (!expected) {
    return Response.json({ error: "route guard not configured" }, { status: 503 });
  }

  if (req.headers.get(SECRET_HEADER) !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!underRateCap()) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  return null;
}
