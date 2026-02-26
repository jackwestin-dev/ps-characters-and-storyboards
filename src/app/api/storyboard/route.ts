import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { StoryboardOutput, ScenePrompt } from "@/types/storyboard";

const OPENART_PREFIX = "Storyboard style: ";

function parseSceneBlock(
  block: string,
  index: number,
  characterBlock?: string
): ScenePrompt {
  const lines = block.trim().split("\n").filter(Boolean);
  let title = `Scene ${index + 1}`;
  let description = block.trim();
  const firstLine = lines[0] ?? "";
  if (firstLine.startsWith("Title:") || firstLine.toLowerCase().startsWith("title:")) {
    title = firstLine.replace(/^Title:\s*/i, "").trim();
    description = lines.slice(1).join(" ").trim() || description;
  }
  const sceneDesc = description.replace(/^Title:.*$/im, "").trim();
  const fullDesc = characterBlock ? `${characterBlock}, ${sceneDesc}` : sceneDesc;
  const openArtPrompt = `${OPENART_PREFIX}${fullDesc}`;
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const characterBlock = (formData.get("characterBlock") as string) || undefined;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "A PDF file is required" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = new Blob([buffer], { type: "application/pdf" });

    // Anthropic Files API (beta): upload once, reference by file_id
    const beta = (client as unknown as { beta?: { files: { upload: (opts: { file: Blob }) => Promise<{ id: string }> } } }).beta;
    const fileId = beta
      ? (await beta.files.upload({ file: blob })).id
      : (await (client as unknown as { files: { create: (opts: { file: Blob }) => Promise<{ id: string }> } }).files.create({ file: blob })).id;

    const userContent = characterBlock
      ? `Character to include in every scene:\n${characterBlock}\n\nAnalyze the attached textbook and output the storyboard in the exact format below.`
      : "Analyze the attached textbook and output the storyboard in the exact format below.";

    const systemPrompt = `You are an expert at turning textbook content into storyboards for OpenArt.ai. Output:
1. A START scene (opening) and END scene (closing).
2. 3-7 middle scenes in order.
For each scene give a short visual description for AI image generation. Use concrete visuals, setting, action, mood. No dialogue in prompts.

Output exactly:

---START---
Title: [title]
[One paragraph visual description]
---END---

---START---
Title: [title]
[One paragraph visual description]
---END---

---SCENES---
Scene 1:
Title: [title]
[description]

Scene 2:
...
---END SCENES---`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "document" as const, source: { type: "file" as const, file_id: fileId } },
            { type: "text" as const, text: userContent },
          ],
        },
      ],
    });

    const text =
      message.content?.find((c) => c.type === "text")?.type === "text"
        ? (message.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
        : "";
    const raw = text.trim();

    const startMatch = raw.match(/---START---\s*([\s\S]*?)---END---/);
    const endMatch = raw.match(/---END---\s*---START---\s*([\s\S]*?)---END---/);
    const scenesMatch = raw.match(/---SCENES---\s*([\s\S]*?)---END SCENES---/);

    const startBlock = startMatch?.[1]?.trim() ?? raw.slice(0, 300);
    const endBlock = endMatch?.[1]?.trim() ?? raw.slice(-300);
    const scenesBlock = scenesMatch?.[1]?.trim() ?? raw;

    const startScene = parseSceneBlock(startBlock, 0, characterBlock);
    const endScene = parseSceneBlock(endBlock, 1, characterBlock);

    const sceneSections = scenesBlock.split(/\n(?=Scene \d+:)/i).filter(Boolean);
    const storyboardScenes: ScenePrompt[] = sceneSections.length > 0
      ? sceneSections.map((section, i) =>
          parseSceneBlock(section.replace(/^Scene \d+:\s*/i, ""), i, characterBlock)
        )
      : [startScene, endScene];

    const titleMatch = raw.match(/^(?:Storyboard:?|Title:?)\s*(.+)$/im);
    const output: StoryboardOutput = {
      title: titleMatch?.[1]?.trim() ?? "Textbook Storyboard",
      startScene,
      endScene,
      storyboardScenes,
      characterBlock,
    };

    return NextResponse.json(output);
  } catch (err) {
    console.error("Storyboard API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
