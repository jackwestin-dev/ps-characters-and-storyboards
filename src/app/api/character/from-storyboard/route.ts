import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type {
  StoryboardScene,
  BeforeAfterPair,
  CharacterOption,
} from "@/types/storyboard";

const OPENART_PREFIX = "Storyboard style: ";

type PairWithDescriptions = {
  label?: string;
  before: { title: string; description: string };
  after: { title: string; description: string };
};

/**
 * Storyboard → Character agent.
 * Input: full storyboard (with video editor + text overlay notes).
 * Output: multiple character options (user picks one) + before/after scene pairs.
 * Scenes are combined with the selected character in the UI.
 */
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
    const storyboard = body.storyboard as
      | { title?: string; scenes?: StoryboardScene[] }
      | undefined;
    const styleGuide = typeof body.styleGuide === "string" ? body.styleGuide.trim() : undefined;

    if (!storyboard?.scenes?.length) {
      return NextResponse.json(
        { error: "storyboard.scenes array is required and must not be empty" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const scenesText = storyboard.scenes
      .map(
        (s, i) =>
          `Scene ${i + 1}: ${s.title}\nSetting: ${s.setting}\nCharacter and objects: ${s.characterAndObjects}\nEmotional state: ${s.emotionalState}\nAnimation notes: ${s.animationNotes}`
      )
      .join("\n\n");

    const styleInstruction = styleGuide
      ? `\n\n**IMPORTANT – OUR STYLE CHARACTER**: All character options MUST conform to this visual style. Every CHARACTER BLOCK you output should follow these rules:\n---STYLE GUIDE---\n${styleGuide}\n---END STYLE GUIDE---\nSo each option is a variation within this style (e.g. different pose, age, or role) but always respecting the style guide.`
      : "";

    const systemPrompt = `You are an expert at creating character options and before/after scene pairs for OpenArt.ai video generation.

Given a storyboard (with Setting, Character and objects, Emotional state, Animation notes), you will:${styleInstruction}

1) **CHARACTER OPTIONS**: Design 3–4 DIFFERENT character options that each fit the storyboard. Each option should be a distinct take (e.g. different age, style, or look) so the user can choose. For each option output a short LABEL (e.g. "Young learner", "Teen protagonist", "Minimalist stick figure") and a CHARACTER BLOCK: one paragraph (under 120 words) describing that character's appearance only. No dialogue or story—only visual description.

2) **BEFORE/AFTER PAIRS**: Produce 3–5 before/after scene pairs. Each pair is two consecutive moments from the storyboard. For each pair output a LABEL and the BEFORE and AFTER scene descriptions (setting + action + mood; no character appearance—that comes from the selected character option). These descriptions will be combined with whichever character the user picks.

Use this EXACT format so the response can be parsed:

---CHARACTER OPTION 1---
---LABEL---
[Short label, e.g. Young learner]
---END LABEL---
---CHARACTER BLOCK---
[One paragraph: character appearance only]
---END CHARACTER BLOCK---
---END CHARACTER OPTION 1---

---CHARACTER OPTION 2---
... (repeat for OPTION 2, 3, 4)
---END CHARACTER OPTION 2---

---PAIR 1---
---LABEL---
[Short label, e.g. Calm → Fear]
---END LABEL---
---BEFORE---
[One paragraph: setting + action + mood for first frame; no character description]
---END BEFORE---
---AFTER---
[One paragraph: setting + action + mood for second frame; no character description]
---END AFTER---
---END PAIR 1---

---PAIR 2---
... (repeat for PAIR 2, 3, ... up to 5)
---END PAIR 2---

Base everything on the storyboard. Keep camera/setting consistent within each pair. No dialogue in prompts.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Storyboard title: ${storyboard.title ?? "Untitled"}\n\nScenes:\n${scenesText}`,
        },
      ],
      system: systemPrompt,
    });

    const text =
      message.content?.find((c) => c.type === "text")?.type === "text"
        ? (message.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
        : "";
    const raw = text.trim();

    const characterOptions: CharacterOption[] = [];
    const optionRegex = /---CHARACTER OPTION\s+\d+---\s*([\s\S]*?)---END CHARACTER OPTION\s+\d+---/gi;
    let optionMatch;
    while ((optionMatch = optionRegex.exec(raw)) !== null) {
      const block = optionMatch[1];
      const labelMatch = block.match(/---LABEL---\s*([\s\S]*?)---END LABEL---/i);
      const charMatch = block.match(/---CHARACTER BLOCK---\s*([\s\S]*?)---END CHARACTER BLOCK---/i);
      const label = labelMatch?.[1]?.trim() ?? `Option ${characterOptions.length + 1}`;
      const characterBlock = charMatch?.[1]?.trim() ?? "";
      if (characterBlock) characterOptions.push({ label, characterBlock });
    }

    const pairSplits = raw.split(/\s*---PAIR\s+\d+\s*---/i).filter((s) => s.trim());
    const pairsWithDescriptions: PairWithDescriptions[] = [];

    for (let i = 0; i < pairSplits.length; i++) {
      const block = pairSplits[i];
      const labelMatch = block.match(/---LABEL---\s*([\s\S]*?)---END LABEL---/i);
      const beforeMatch = block.match(/---BEFORE---\s*([\s\S]*?)---END BEFORE---/i);
      const afterMatch = block.match(/---AFTER---\s*([\s\S]*?)---END AFTER---/i);
      const label = labelMatch?.[1]?.trim() ?? `Pair ${i + 1}`;
      const beforeDesc = beforeMatch?.[1]?.trim() ?? "";
      const afterDesc = afterMatch?.[1]?.trim() ?? "";
      if (!beforeDesc || !afterDesc) continue;
      pairsWithDescriptions.push({
        label,
        before: { title: `Before: ${label}`, description: beforeDesc },
        after: { title: `After: ${label}`, description: afterDesc },
      });
    }

    if (characterOptions.length === 0) {
      return NextResponse.json(
        { error: "Could not parse any character options from model response" },
        { status: 500 }
      );
    }

    const defaultBlock = characterOptions[0].characterBlock;
    const beforeAfterPairs: BeforeAfterPair[] = pairsWithDescriptions.map(
      (p, i) => ({
        label: p.label,
        before: {
          index: i * 2,
          title: p.before.title,
          description: p.before.description,
          openArtPrompt: `${OPENART_PREFIX}${defaultBlock}, ${p.before.description}`,
        },
        after: {
          index: i * 2 + 1,
          title: p.after.title,
          description: p.after.description,
          openArtPrompt: `${OPENART_PREFIX}${defaultBlock}, ${p.after.description}`,
        },
      })
    );

    return NextResponse.json({
      characterOptions,
      beforeAfterPairs,
      pairDescriptions: pairsWithDescriptions,
    });
  } catch (err) {
    console.error("Character from storyboard API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate" },
      { status: 500 }
    );
  }
}
