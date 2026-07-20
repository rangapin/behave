import { guard } from "@/lib/guard";

// specs.md §4
const ELEVEN_MODEL = "eleven_turbo_v2_5";
const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75 };

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    // Not fatal — §4's fallback chain drops to the browser voice.
    return Response.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 503 });
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "malformed body" }, { status: 400 });
  }

  const text = body.text?.trim();
  const voiceId = body.voiceId?.trim();
  if (!text || !voiceId) {
    return Response.json({ error: "text and voiceId required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          voice_settings: VOICE_SETTINGS,
        }),
      },
    );

    if (!upstream.ok) {
      // Surface the reason so a bad voiceId shows an inline notice rather than
      // failing silently — §4 and the phase 2 verification both depend on this.
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        { error: `elevenlabs ${upstream.status}`, detail: detail.slice(0, 400) },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/tts]", err);
    return Response.json({ error: "upstream unreachable" }, { status: 502 });
  }
}
