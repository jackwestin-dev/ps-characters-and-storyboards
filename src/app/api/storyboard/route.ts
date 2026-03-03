import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type {
  StoryboardOutput,
  ScenePrompt,
  StoryboardScene,
} from "@/types/storyboard";

const OPENART_PREFIX = "Storyboard style: ";

function parseSection(block: string, startTag: string, endTag: string): string {
  const regex = new RegExp(
    `${startTag}\\s*([\\s\\S]*?)${endTag}`,
    "i"
  );
  const m = block.match(regex);
  return m?.[1]?.trim() ?? "";
}

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

/** Parse full storyboard format into StoryboardScene and ScenePrompt. */
function parseFullSceneBlock(
  rawBlock: string,
  index: number,
  characterBlock?: string
): { scene: StoryboardScene; prompt: ScenePrompt } {
  const title = parseSection(rawBlock, "---SCENE TITLE---", "---END SCENE TITLE---")
    || parseSection(rawBlock, "---TITLE---", "---END TITLE---")
    || `Scene ${index + 1}`;
  const setting = parseSection(rawBlock, "---SETTING---", "---END SETTING---");
  const characterAndObjects = parseSection(
    rawBlock,
    "---CHARACTER AND OBJECTS---",
    "---END CHARACTER AND OBJECTS---"
  );
  const emotionalState = parseSection(
    rawBlock,
    "---EMOTIONAL STATE---",
    "---END EMOTIONAL STATE---"
  );
  const animationNotes = parseSection(
    rawBlock,
    "---ANIMATION NOTES---",
    "---END ANIMATION NOTES---"
  );
  const textOverlayNotes = parseSection(
    rawBlock,
    "---TEXT OVERLAY---",
    "---END TEXT OVERLAY---"
  );

  const description = [setting, characterAndObjects, emotionalState]
    .filter(Boolean)
    .join(" ");
  const fullDesc = characterBlock ? `${characterBlock}, ${description}` : description;
  const openArtPrompt = `${OPENART_PREFIX}${fullDesc}`;

  const scene: StoryboardScene = {
    index,
    title,
    setting,
    characterAndObjects,
    emotionalState,
    animationNotes,
    ...(textOverlayNotes ? { textOverlayNotes } : {}),
    description,
    openArtPrompt,
  };
  const prompt: ScenePrompt = {
    index,
    title,
    description,
    openArtPrompt,
  };
  return { scene, prompt };
}

const FULL_FORMAT_SYSTEM = `You are an expert at turning textbook content into storyboards for video production and OpenArt.ai. Your storyboard will teach specific concepts from the chapter. Each scene must include:

1. **Setting** – Location, camera angle (e.g. medium-wide, fixed), lighting, environment.
2. **Character and objects** – Who is in the frame, posture, expression, clothing, key objects. Be specific so an animator or AI can match the scene.
3. **Emotional state being conveyed** – What the scene teaches or conveys (e.g. "calm environment, positive affect" or "immediate fear response triggered by unexpected cue").
4. **Animation notes** (video editor notes) – Camera movement (or "No camera movement. No zoom. No pan."), subtle effects (e.g. "Subtle fire flicker only"), when elements appear (e.g. "Owl eyes appear in the darkness"). Be concrete so an editor can follow them.
5. **Text overlay** (optional) – Short on-screen text or caption for the frame (e.g. "Calm", "Fear response"), or "None" if no overlay.

Output 2–6 scenes. Use the EXACT delimiter format below so the response can be parsed. Every scene must have all sections.

---STORYBOARD TITLE---
[One line: storyboard title, e.g. "Emotions and Stress at a Campfire"]
---END STORYBOARD TITLE---

---SCENE---
---SCENE TITLE---
[Scene 1: Short title – concept, e.g. "Scene 1: Calm context – positive emotional state"]
---END SCENE TITLE---
---SETTING---
[Paragraph: setting only]
---END SETTING---
---CHARACTER AND OBJECTS---
[Paragraph: character(s), posture, expression, objects]
---END CHARACTER AND OBJECTS---
---EMOTIONAL STATE---
[Paragraph: what the scene conveys]
---END EMOTIONAL STATE---
---ANIMATION NOTES---
[One or two sentences: camera, zoom, pan, subtle effects]
---END ANIMATION NOTES---
---TEXT OVERLAY---
[Short caption or "None"]
---END TEXT OVERLAY---
---END SCENE---

---SCENE---
[Repeat for Scene 2, 3, ...]
---END SCENE---

Use concrete visuals. No dialogue in the scene descriptions. Maintain continuity between scenes (same location/angle when appropriate).`;

function buildOutput(
  raw: string,
  characterBlock: string | undefined
): StoryboardOutput {
  const titleMatch = raw.match(/---STORYBOARD TITLE---\s*([\s\S]*?)---END STORYBOARD TITLE---/);
  const storyboardTitle = titleMatch?.[1]?.trim() ?? "Textbook Storyboard";

  const sceneBlocks = raw.split(/\s*---SCENE---\s*/).filter((b) => b.includes("---SETTING---"));
  const scenes: StoryboardScene[] = [];
  const storyboardScenes: ScenePrompt[] = [];

  for (let i = 0; i < sceneBlocks.length; i++) {
    const block = sceneBlocks[i];
    if (!block.trim()) continue;
    try {
      const { scene, prompt } = parseFullSceneBlock(block, scenes.length, characterBlock);
      scene.index = scenes.length;
      prompt.index = scenes.length;
      scenes.push(scene);
      storyboardScenes.push(prompt);
    } catch {
      const fallbackPrompt = parseSceneBlock(block, scenes.length, characterBlock);
      scenes.push({
        index: scenes.length,
        title: fallbackPrompt.title,
        setting: block.slice(0, 400).trim(),
        characterAndObjects: "",
        emotionalState: "",
        animationNotes: "",
        description: fallbackPrompt.description,
        openArtPrompt: fallbackPrompt.openArtPrompt,
      });
      storyboardScenes.push(fallbackPrompt);
    }
  }

  const startScene = storyboardScenes[0] ?? { index: 0, title: "Start", description: "", openArtPrompt: "" };
  const endScene = storyboardScenes[storyboardScenes.length - 1] ?? startScene;

  return {
    title: storyboardTitle,
    startScene,
    endScene,
    storyboardScenes: storyboardScenes.length > 0 ? storyboardScenes : [startScene, endScene],
    scenes: scenes.length > 0 ? scenes : undefined,
    characterBlock,
  };
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

    const contentType = request.headers.get("content-type") ?? "";
    let raw: string;
    let characterBlock: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await request.json() as { chapterText?: string; segments?: string[]; characterBlock?: string };
      const segments = body.segments;
      const chapterText = body.chapterText ?? (Array.isArray(segments) ? segments.join("\n\n") : undefined);
      const textInput = typeof chapterText === "string" ? chapterText.trim() : "";
      if (!textInput) {
        return NextResponse.json(
          { error: "Provide chapterText or segments (paste textbook segments)" },
          { status: 400 }
        );
      }
      characterBlock = typeof body.characterBlock === "string" ? body.characterBlock.trim() || undefined : undefined;

      const client = new Anthropic({ apiKey });
      const userContent = characterBlock
        ? `Character to include in every scene:\n${characterBlock}\n\nAnalyze the following textbook segment(s) and output the storyboard in the EXACT format specified (with all ---TAGS---). Teach specific concepts from the content.\n\n---TEXTBOOK CONTENT---\n${textInput}\n---END TEXTBOOK CONTENT---`
        : `Analyze the following textbook segment(s) and output the storyboard in the EXACT format specified (with all ---TAGS---). Teach specific concepts from the content.\n\n---TEXTBOOK CONTENT---\n${textInput}\n---END TEXTBOOK CONTENT---`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: userContent }],
        system: FULL_FORMAT_SYSTEM,
      });

      const textPart = message.content?.find((c) => c.type === "text");
      raw = (textPart && textPart.type === "text" ? textPart.text : "").trim();
    } else {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      characterBlock = (formData.get("characterBlock") as string) || undefined;

      if (!file || file.size === 0) {
        return NextResponse.json(
          { error: "A PDF file is required, or send JSON with chapterText / segments" },
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

      const beta = (client as unknown as { beta?: { files: { upload: (opts: { file: Blob }) => Promise<{ id: string }> } } }).beta;
      const fileId = beta
        ? (await beta.files.upload({ file: blob })).id
        : (await (client as unknown as { files: { create: (opts: { file: Blob }) => Promise<{ id: string }> } }).files.create({ file: blob })).id;

      const userContent = characterBlock
        ? `Character to include in every scene:\n${characterBlock}\n\nAnalyze the attached textbook chapter and output the storyboard in the EXACT format specified (with all ---TAGS---). Teach specific concepts from the chapter.`
        : "Analyze the attached textbook chapter and output the storyboard in the EXACT format specified (with all ---TAGS---). Teach specific concepts from the chapter.";

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            // Document + file_id is supported by API; SDK types may not include it yet
            content: [
              { type: "document", source: { type: "file", file_id: fileId } },
              { type: "text", text: userContent },
            ] as Parameters<typeof client.messages.create>[0]["messages"][0]["content"],
          },
        ],
        system: FULL_FORMAT_SYSTEM,
      });

      const textPart = message.content?.find((c) => c.type === "text");
      raw = (textPart && textPart.type === "text" ? textPart.text : "").trim();
    }


    return NextResponse.json(buildOutput(raw, characterBlock));
  } catch (err) {
    console.error("Storyboard API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
