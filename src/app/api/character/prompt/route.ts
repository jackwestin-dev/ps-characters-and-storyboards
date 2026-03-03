import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CharacterFeatures } from "@/types/character";

const OPENART_PREFIX = "Storyboard style: ";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as CharacterFeatures;
    const { name, appearance, hair, outfit, accessories, expression, notes, styleGuide } =
      body;

    const hasStyleGuide = styleGuide?.trim();
    const hasStructured = [name, appearance, hair].some((f) => f?.trim());

    if (!hasStyleGuide && !hasStructured) {
      return NextResponse.json(
        { error: "Provide either styleGuide or name + appearance + hair" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    let characterBlock: string;

    if (hasStyleGuide) {
      // Use full style guide: ask Claude to produce a single prompt-ready paragraph that preserves all visual rules
      const prompt = `You are an expert at writing image prompts for consistent character generation. Below is a full visual style guide for a character (e.g. minimalist stick figure). Turn it into ONE concise "character block" paragraph (under 120 words) that will be prepended to every scene prompt. Preserve every visual rule: body style, outlines, colors, face, clothing, age/size scaling notes. No dialogue or story—only visual description. Output ONLY the character block, nothing else.

Style guide:
${(styleGuide ?? "").trim()}`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        message.content?.find((c) => c.type === "text")?.type === "text"
          ? (message.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
          : "";
      characterBlock = text.trim();
    } else {
      if (!name?.trim() || !appearance?.trim() || !hair?.trim()) {
        return NextResponse.json(
          { error: "name, appearance, and hair are required when not using styleGuide" },
          { status: 400 }
        );
      }

      const prompt = `You are an expert at writing image prompts for consistent character generation. Given the following character features, output a single paragraph "character block" that will be prepended to every scene prompt so the same character appears in all images. Use concrete, specific visual details (face shape, hair, skin, distinctive features, default outfit). No dialogue or story—only visual description. Keep it under 80 words.

Character:
- Name: ${name}
- Appearance: ${appearance}
- Hair: ${hair}
${outfit ? `- Outfit: ${outfit}` : ""}
${accessories ? `- Accessories: ${accessories}` : ""}
${expression ? `- Expression/style: ${expression}` : ""}
${notes ? `- Notes: ${notes}` : ""}

Output ONLY the character description paragraph, nothing else.`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        message.content?.find((c) => c.type === "text")?.type === "text"
          ? (message.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
          : "";
      characterBlock = text.trim();
    }

    // Build a full OpenArt-ready prompt example (scene-agnostic)
    const openArtPrompt = `${OPENART_PREFIX}${characterBlock}, standing in a neutral setting, full body, clear lighting.`;

    return NextResponse.json({
      characterBlock,
      openArtPrompt,
    });
  } catch (err) {
    console.error("Character prompt API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate prompt" },
      { status: 500 }
    );
  }
}
