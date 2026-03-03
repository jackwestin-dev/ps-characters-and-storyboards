import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ScenePrompt } from "@/types/storyboard";

const OPENART_PREFIX = "Storyboard style: ";

function parseSceneBlock(
  block: string,
  index: number,
  characterBlock: string
): ScenePrompt {
  const lines = block.trim().split("\n").filter(Boolean);
  let title = index === 0 ? "Start scene" : "End scene";
  let description = block.trim();
  const firstLine = lines[0] ?? "";
  if (firstLine.startsWith("Title:") || firstLine.toLowerCase().startsWith("title:")) {
    title = firstLine.replace(/^Title:\s*/i, "").trim();
    description = lines.slice(1).join(" ").trim() || description;
  }
  const sceneDesc = description.replace(/^Title:.*$/im, "").trim();
  const openArtPrompt = `${OPENART_PREFIX}${characterBlock}, ${sceneDesc}`;
  return { index, title, description: sceneDesc, openArtPrompt };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const chapterText = typeof body.chapterText === "string" ? body.chapterText.trim() : "";

    if (!chapterText) {
      return NextResponse.json(
        { error: "chapterText is required" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are an expert at turning textbook chapters into storyboard assets for OpenArt.ai.

Given a textbook chapter, you will output exactly three things in this exact format:

1) A CHARACTER BLOCK: one short paragraph (under 120 words) describing a single main character that fits the chapter (e.g. a learner, scientist, or protagonist). Visual only: appearance, age, clothing, style. This will be prepended to every scene prompt for consistency. No dialogue or story.

2) A START SCENE: the opening moment of the chapter—one visual scene (setting, character, mood). Format:
---START SCENE---
Title: [short title]
[One paragraph visual description for the opening scene]
---END START SCENE---

3) An END SCENE: the closing moment or takeaway of the chapter—one visual scene. Format:
---END SCENE---
Title: [short title]
[One paragraph visual description for the closing scene]
---END END SCENE---

Also output the character block in this format:
---CHARACTER BLOCK---
[The character description paragraph only]
---END CHARACTER BLOCK---

Output order: ---CHARACTER BLOCK--- first, then ---START SCENE---, then ---END SCENE---. Use concrete visuals, setting, and mood. No dialogue in prompts.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Textbook chapter:\n\n${chapterText}`,
        },
      ],
      system: systemPrompt,
    });

    const text =
      message.content?.find((c) => c.type === "text")?.type === "text"
        ? (message.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
        : "";
    const raw = text.trim();

    const charMatch = raw.match(/---CHARACTER BLOCK---\s*([\s\S]*?)---END CHARACTER BLOCK---/);
    const startMatch = raw.match(/---START SCENE---\s*([\s\S]*?)---END START SCENE---/);
    const endMatch = raw.match(/---END SCENE---\s*([\s\S]*?)---END END SCENE---/);

    const characterBlock = charMatch?.[1]?.trim() ?? "";
    const startBlock = startMatch?.[1]?.trim() ?? "";
    const endBlock = endMatch?.[1]?.trim() ?? "";

    if (!characterBlock) {
      return NextResponse.json(
        { error: "Could not parse character block from model response" },
        { status: 500 }
      );
    }

    const startScene = parseSceneBlock(startBlock || "Opening of chapter.", 0, characterBlock);
    const endScene = parseSceneBlock(endBlock || "Closing of chapter.", 1, characterBlock);

    return NextResponse.json({
      characterBlock,
      startScene,
      endScene,
    });
  } catch (err) {
    console.error("Character from chapter API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate" },
      { status: 500 }
    );
  }
}
