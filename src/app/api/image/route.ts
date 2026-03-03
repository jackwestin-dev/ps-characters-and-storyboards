import { NextResponse } from "next/server";

/**
 * POST /api/image
 * Body: { prompt: string, provider?: "auto" | "gemini" | "pollinations" }
 * Returns: { images: { base64: string; mimeType: string }[], provider?: string } or error.
 *
 * Providers:
 * - auto: try Gemini first, then Pollinations (no key required).
 * - gemini: Gemini 2.5 Flash Image (Nano Banana); needs GEMINI_API_KEY.
 * - pollinations: Pollinations.ai (free, no API key).
 */

async function pollinationsGenerate(prompt: string): Promise<{ base64: string; mimeType: string }[]> {
  const encoded = encodeURIComponent(prompt);
  const urls = [
    `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`,
    `https://gen.pollinations.ai/image/${encoded}`,
  ];
  let lastErr: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60000) });
      if (!res.ok) {
        const msg = res.statusText?.trim() || "Service error";
        if (res.status >= 500) {
          lastErr = new Error(
            `Pollinations is temporarily unavailable (${res.status}). Try again in a minute or use Gemini.`
          );
          continue;
        }
        throw new Error(`Pollinations ${res.status}: ${msg}`);
      }
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const mime = res.headers.get("content-type") || "image/png";
      return [{ base64, mimeType: mime }];
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        lastErr = new Error("Pollinations timed out. Try again or use Gemini.");
        continue;
      }
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error("Pollinations failed. Try again or use Gemini.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const provider = (body.provider === "gemini" || body.provider === "pollinations" ? body.provider : "auto") as "auto" | "gemini" | "pollinations";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const origin =
      request.headers.get("x-forwarded-proto") && request.headers.get("x-forwarded-host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : new URL(request.url).origin;

    if (provider === "pollinations") {
      const images = await pollinationsGenerate(prompt);
      return NextResponse.json({ images, provider: "pollinations" });
    }

    if (provider === "gemini") {
      const res = await fetch(`${origin}/api/gemini/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, numberOfImages: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || data.detail || "Gemini failed", images: [] },
          { status: 200 }
        );
      }
      if (data.images?.length) {
        return NextResponse.json({ images: data.images, provider: "gemini" });
      }
      return NextResponse.json(
        { error: data.error || data.detail || "No image from Gemini", images: [] },
        { status: 200 }
      );
    }

    // provider === "auto": try Gemini, then Pollinations
    const geminiRes = await fetch(`${origin}/api/gemini/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, numberOfImages: 1 }),
    });
    const geminiData = await geminiRes.json();
    if (geminiRes.ok && geminiData.images?.length) {
      return NextResponse.json({ images: geminiData.images, provider: "gemini" });
    }

    const images = await pollinationsGenerate(prompt);
    return NextResponse.json({ images, provider: "pollinations" });
  } catch (err) {
    console.error("Image API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed", images: [] },
      { status: 200 }
    );
  }
}
