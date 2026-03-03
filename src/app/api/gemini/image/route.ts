import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * POST /api/gemini/image
 * Body: { prompt: string, numberOfImages?: number }
 * Returns: { images: { base64: string, mimeType: string }[] } or error.
 * Uses Nano Banana (Gemini 2.5 Flash Image) / Gemini image models.
 */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY or GOOGLE_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    type Part = {
      inlineData?: { data?: string; mimeType?: string };
      inline_data?: { data?: string; mime_type?: string };
    };
    type Content = { content?: { parts?: Part[] } };
    type Res = { candidates?: Content[]; error?: { message?: string } };

    const collectImages = (response: Res): { base64: string; mimeType: string }[] => {
      const out: { base64: string; mimeType: string }[] = [];
      const candidates = response.candidates;
      if (!candidates?.[0]?.content?.parts) return out;
      for (const part of candidates[0].content.parts) {
        const inline = part.inlineData;
        const snake = part.inline_data;
        const data = inline?.data ?? snake?.data;
        const mime = inline?.mimeType ?? snake?.mime_type ?? "image/png";
        if (data) out.push({ base64: data, mimeType: mime });
      }
      return out;
    };

    let images: { base64: string; mimeType: string }[] = [];
    let lastError: Error | null = null;

    // 1) Try REST directly for gemini-2.5-flash-image (matches AI Studio docs exactly)
    try {
      const restRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        }
      );
      const restJson = (await restRes.json()) as Res & {
        error?: { message?: string; status?: string; code?: number; details?: unknown };
      };
      if (!restRes.ok) {
        const msg =
          restJson.error?.message ??
          (typeof restJson.error === "object" ? JSON.stringify(restJson.error) : null) ??
          `REST ${restRes.status}`;
        lastError = new Error(msg);
        console.warn("[Gemini image] REST gemini-2.5-flash-image error:", restRes.status, restJson.error);
      } else {
        images = collectImages(restJson);
        if (images.length === 0 && restJson.candidates?.[0]) {
          const c = restJson.candidates[0];
          const finishReason = (c as { finishReason?: string }).finishReason ?? (c.content as { finishReason?: string })?.finishReason;
          console.warn("[Gemini image] REST returned no image. finishReason:", finishReason, "parts:", c.content?.parts?.map((p) => Object.keys(p)));
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn("[Gemini image] REST attempt error:", lastError.message);
    }

    // 2) Fallback: SDK with gemini-2.5-flash-image only (avoids gemini-2.0-flash-exp free-tier quota)
    if (images.length === 0) {
      const ai = new GoogleGenAI({ apiKey });
      const attempts: { model: string; useConfig: boolean }[] = [
        { model: "gemini-2.5-flash-image", useConfig: false },
        { model: "gemini-2.5-flash-image", useConfig: true },
      ];
      for (const { model, useConfig } of attempts) {
        if (images.length > 0) break;
        try {
          const params = {
            model,
            contents: prompt,
            ...(useConfig && {
              config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
            }),
          };
          const response = (await ai.models.generateContent(params)) as Res;
          images = collectImages(response);
          if (images.length === 0 && response.candidates?.[0]?.content?.parts) {
            console.warn(
              "[Gemini image] SDK model",
              model,
              "returned no inlineData. Parts:",
              response.candidates[0].content.parts.map((p) => Object.keys(p))
            );
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn("[Gemini image] SDK model", model, "error:", lastError.message);
        }
      }
    }

    if (images.length === 0) {
      const rawMessage =
        lastError?.message ||
        "No images were generated. Try a different prompt or check that your API key has access to image models.";
      const isAuthError =
        rawMessage.toLowerCase().includes("api key") ||
        rawMessage.toLowerCase().includes("permission") ||
        rawMessage.toLowerCase().includes("403");
      const isRateLimit =
        rawMessage.includes("429") ||
        rawMessage.toLowerCase().includes("quota") ||
        rawMessage.toLowerCase().includes("rate limit") ||
        rawMessage.toLowerCase().includes("RESOURCE_EXHAUSTED");
      const retryMatch = rawMessage.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
      const retrySec = retryMatch ? Math.ceil(Number(retryMatch[1])) : 40;
      const userMessage = isAuthError
        ? "Invalid or missing API key. Add GEMINI_API_KEY to .env.local (from Google AI Studio)."
        : isRateLimit
          ? `Rate limit exceeded. Wait about ${retrySec} seconds and try again, or check your quota: https://ai.google.dev/gemini-api/docs/rate-limits`
          : rawMessage;
      console.error("Gemini image error:", lastError ?? rawMessage);
      return NextResponse.json(
        {
          error: userMessage,
          detail: isAuthError || isRateLimit ? rawMessage : undefined,
          images: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error("Gemini image API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
