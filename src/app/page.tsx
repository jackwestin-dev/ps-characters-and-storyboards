"use client";

import { useState } from "react";
import { STICK_FIGURE_STYLE_GUIDE } from "@/types/character";
import type {
  StoryboardOutput,
  StoryboardScene,
  BeforeAfterPair,
  CharacterOption,
} from "@/types/storyboard";

const OPENART_PREFIX = "Storyboard style: ";

type Tab = "character" | "storyboard";

export default function Home() {
  const [tab, setTab] = useState<Tab>("character");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">
          Character & Storyboard
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Consistent character prompts + textbook → OpenArt storyboards
        </p>
      </header>

      <nav className="flex border-b border-slate-200 bg-white px-6">
        <button
          type="button"
          onClick={() => setTab("character")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "character"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Character
        </button>
        <button
          type="button"
          onClick={() => setTab("storyboard")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "storyboard"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Textbook → Storyboard
        </button>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {tab === "character" && <CharacterSection />}
        {tab === "storyboard" && <StoryboardSection />}
      </main>
    </div>
  );
}

function CharacterSection() {
  const [styleGuide, setStyleGuide] = useState("");
  const [characterBlock, setCharacterBlock] = useState("");
  const [openArtExample, setOpenArtExample] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStickFigure = () => {
    setStyleGuide(STICK_FIGURE_STYLE_GUIDE);
    setError("");
  };

  const generate = async () => {
    if (!styleGuide.trim()) {
      setError("Enter a style guide or load the stick-figure preset.");
      return;
    }
    setLoading(true);
    setError("");
    setCharacterBlock("");
    setOpenArtExample("");
    try {
      const res = await fetch("/api/character/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleGuide: styleGuide.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setCharacterBlock(data.characterBlock ?? "");
      setOpenArtExample(data.openArtPrompt ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <section className="space-y-10">
      <CharacterFromStyleGuide
        styleGuide={styleGuide}
        setStyleGuide={setStyleGuide}
        characterBlock={characterBlock}
        setCharacterBlock={setCharacterBlock}
        openArtExample={openArtExample}
        setOpenArtExample={setOpenArtExample}
        loading={loading}
        setLoading={setLoading}
        error={error}
        setError={setError}
        loadStickFigure={loadStickFigure}
        generate={generate}
        copy={copy}
      />
      <CharacterFromChapter copy={copy} />
    </section>
  );
}

function CharacterFromStyleGuide({
  styleGuide,
  setStyleGuide,
  characterBlock,
  openArtExample,
  loading,
  error,
  loadStickFigure,
  generate,
  copy,
}: {
  styleGuide: string;
  setStyleGuide: (s: string) => void;
  characterBlock: string;
  setCharacterBlock: (s: string) => void;
  openArtExample: string;
  setOpenArtExample: (s: string) => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  error: string;
  setError: (s: string) => void;
  loadStickFigure: () => void;
  generate: () => void;
  copy: (t: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Character style guide
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Use the full stick-figure spec or your own. This becomes the character
          block for every storyboard scene.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={loadStickFigure}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Load stick-figure style
        </button>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate character block"}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Style guide (paste or edit)
        </label>
        <textarea
          value={styleGuide}
          onChange={(e) => setStyleGuide(e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="Paste your character visual style guide here, or click Load stick-figure style."
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {characterBlock && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Character block (use in Textbook → Storyboard)
            </h3>
            <button
              type="button"
              onClick={() => copy(characterBlock)}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Copy
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {characterBlock}
          </p>
          {openArtExample && (
            <>
              <h3 className="text-sm font-semibold text-slate-700">
                Example OpenArt prompt
              </h3>
              <p className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs text-slate-600">
                {openArtExample}
              </p>
              <button
                type="button"
                onClick={() => copy(openArtExample)}
                className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Copy prompt
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type ChapterResult = {
  characterBlock: string;
  startScene: { title: string; description: string; openArtPrompt: string };
  endScene: { title: string; description: string; openArtPrompt: string };
};

function CharacterFromChapter({ copy }: { copy: (t: string) => void }) {
  const [chapterText, setChapterText] = useState("");
  const [result, setResult] = useState<ChapterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!chapterText.trim()) {
      setError("Paste a textbook chapter to continue.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/character/from-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterText: chapterText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setResult({
        characterBlock: data.characterBlock ?? "",
        startScene: data.startScene ?? { title: "", description: "", openArtPrompt: "" },
        endScene: data.endScene ?? { title: "", description: "", openArtPrompt: "" },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 border-t border-slate-200 pt-10">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Generate character block from textbook chapter
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Paste a textbook chapter. You get a character that fits the chapter
          plus a <strong>start scene</strong> and <strong>end scene</strong> for
          OpenArt.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Textbook chapter (paste text)
        </label>
        <textarea
          value={chapterText}
          onChange={(e) => setChapterText(e.target.value)}
          rows={10}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="Paste the full chapter or a long excerpt…"
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Generating character + scenes…" : "Generate character + start/end scenes"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Character block
            </h3>
            <button
              type="button"
              onClick={() => copy(result.characterBlock)}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Copy
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {result.characterBlock}
          </p>

          <SceneCard
            title="Start scene"
            scene={result.startScene}
            onCopy={() => copy(result.startScene.openArtPrompt)}
          />
          <SceneCard
            title="End scene"
            scene={result.endScene}
            onCopy={() => copy(result.endScene.openArtPrompt)}
          />
        </div>
      )}
    </div>
  );
}

type PairDescription = {
  label?: string;
  before: { title: string; description: string };
  after: { title: string; description: string };
};

type CharacterFromStoryboardResult = {
  characterOptions: CharacterOption[];
  beforeAfterPairs: BeforeAfterPair[];
  pairDescriptions?: PairDescription[];
};

function StoryboardSection() {
  const [segmentsText, setSegmentsText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [characterBlock, setCharacterBlock] = useState("");
  const [styleCharacter, setStyleCharacter] = useState(STICK_FIGURE_STYLE_GUIDE);
  const [result, setResult] = useState<StoryboardOutput | null>(null);
  const [characterResult, setCharacterResult] =
    useState<CharacterFromStoryboardResult | null>(null);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [characterLoading, setCharacterLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    const usePaste = segmentsText.trim().length > 0;
    if (!usePaste && !file) {
      setError("Paste textbook segments above or choose a PDF file.");
      return;
    }
    if (!usePaste && file && file.size === 0) {
      setError("Choose a PDF file or paste textbook segments.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setCharacterResult(null);
    setSelectedCharacterIndex(0);
    try {
      if (usePaste) {
        const res = await fetch("/api/storyboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterText: segmentsText.trim(),
            characterBlock: characterBlock.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate storyboard");
        setResult(data);
      } else {
        const form = new FormData();
        form.append("file", file!);
        if (characterBlock.trim()) form.append("characterBlock", characterBlock.trim());
        const res = await fetch("/api/storyboard", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate storyboard");
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const generateCharacterFromStoryboard = async () => {
    if (!result?.scenes?.length) return;
    setCharacterLoading(true);
    setError("");
    setCharacterResult(null);
    try {
      const res = await fetch("/api/character/from-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboard: { title: result.title, scenes: result.scenes },
          styleGuide: styleCharacter.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate character");
      setCharacterResult({
        characterOptions: data.characterOptions ?? [],
        beforeAfterPairs: data.beforeAfterPairs ?? [],
        pairDescriptions: data.pairDescriptions ?? [],
      });
      setSelectedCharacterIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCharacterLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Step-by-step: Textbook → Storyboard → Scenes → Character options
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Step 1: Paste short textbook segments (or upload a PDF). Step 2: Get a storyboard with video editor + text overlay notes. Step 3: Generate scenes with a character, then choose from multiple character options in your chosen style.
        </p>
      </div>

      {/* Step 1: Input */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Step 1 — Input
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Paste textbook segments
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            One or more short excerpts. Leave empty to use a PDF instead.
          </p>
          <textarea
            value={segmentsText}
            onChange={(e) => setSegmentsText(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Paste your textbook segment(s) here…"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Or upload PDF
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Character block (optional, for storyboard)
          </label>
          <textarea
            value={characterBlock}
            onChange={(e) => setCharacterBlock(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Optional: paste a character block to include in every scene."
          />
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating storyboard…" : "Step 1 → Generate storyboard"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Step 2 — Storyboard
            </p>
            <h3 className="text-lg font-semibold text-slate-800">{result.title}</h3>

            {result.scenes && result.scenes.length > 0 ? (
              <div className="mt-4 space-y-6">
                {result.scenes.map((scene) => (
                  <FullSceneCard
                    key={scene.index}
                    scene={scene}
                    onCopyPrompt={() =>
                      scene.openArtPrompt && copy(scene.openArtPrompt)
                    }
                  />
                ))}
                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Step 3 — Scenes + character options (our style)
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Our style character
                    </label>
                    <p className="mt-0.5 text-xs text-slate-500">
                      All character options will follow this style. Edit or use the default.
                    </p>
                    <textarea
                      value={styleCharacter}
                      onChange={(e) => setStyleCharacter(e.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Minimalist stick figure style…"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateCharacterFromStoryboard}
                    disabled={characterLoading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {characterLoading
                      ? "Generating character + scene options…"
                      : "Step 3 → Generate scenes + character options (in this style)"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <SceneCard
                  title="Start scene"
                  scene={result.startScene}
                  onCopy={() => copy(result.startScene.openArtPrompt)}
                />
                <SceneCard
                  title="End scene"
                  scene={result.endScene}
                  onCopy={() => copy(result.endScene.openArtPrompt)}
                />
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    Full storyboard ({result.storyboardScenes.length} scenes)
                  </h4>
                  <ul className="space-y-3">
                    {result.storyboardScenes.map((s) => (
                      <li key={s.index} className="rounded bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {s.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => copy(s.openArtPrompt)}
                            className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                          {s.openArtPrompt}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {characterResult && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Step 3 result — Pick a character and copy prompts
              </p>
              <CharacterFromStoryboardResult
                result={characterResult}
                selectedCharacterIndex={selectedCharacterIndex}
                onSelectCharacter={setSelectedCharacterIndex}
                copy={copy}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function CharacterFromStoryboardResult({
  result,
  selectedCharacterIndex,
  onSelectCharacter,
  copy,
}: {
  result: CharacterFromStoryboardResult;
  selectedCharacterIndex: number;
  onSelectCharacter: (index: number) => void;
  copy: (text: string) => void;
}) {
  const options = result.characterOptions;
  const selected = options[selectedCharacterIndex];
  const pairDescriptions = result.pairDescriptions ?? [];
  const buildPrompt = (description: string) =>
    selected
      ? `${OPENART_PREFIX}${selected.characterBlock}, ${description}`
      : "";

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-lg font-semibold text-slate-800">
        Character options + before/after scenes
      </h4>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          Choose a character for the scene
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectCharacter(idx)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                selectedCharacterIndex === idx
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <span className="font-medium text-slate-800">{opt.label}</span>
              <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                {opt.characterBlock}
              </p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700">
              Selected character block (use in OpenArt)
            </p>
            <button
              type="button"
              onClick={() => copy(selected.characterBlock)}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Copy
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {selected.characterBlock}
          </p>
        </>
      )}

      <div className="space-y-6 border-t border-slate-200 pt-4">
        <h5 className="text-sm font-semibold text-slate-700">
          Before/after pairs ({result.beforeAfterPairs.length})
        </h5>
        {(pairDescriptions.length > 0
          ? pairDescriptions.map((p) => ({
              label: p.label,
              before: {
                title: p.before.title,
                description: p.before.description,
                openArtPrompt: buildPrompt(p.before.description),
              },
              after: {
                title: p.after.title,
                description: p.after.description,
                openArtPrompt: buildPrompt(p.after.description),
              },
            }))
          : result.beforeAfterPairs
        ).map((pair, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <p className="mb-3 text-sm font-medium text-indigo-700">
              {pair.label ?? `Pair ${idx + 1}`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SceneCard
                title="Before"
                scene={pair.before}
                onCopy={() => copy(pair.before.openArtPrompt)}
              />
              <SceneCard
                title="After"
                scene={pair.after}
                onCopy={() => copy(pair.after.openArtPrompt)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullSceneCard({
  scene,
  onCopyPrompt,
}: {
  scene: StoryboardScene;
  onCopyPrompt: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-700">{scene.title}</h4>
        {scene.openArtPrompt && (
          <button
            type="button"
            onClick={onCopyPrompt}
            className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300"
          >
            Copy OpenArt prompt
          </button>
        )}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-slate-600">Setting</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">
            {scene.setting}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Character and objects</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">
            {scene.characterAndObjects}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Emotional state</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">
            {scene.emotionalState}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Animation notes</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-slate-600">
            {scene.animationNotes}
          </dd>
        </div>
        {scene.textOverlayNotes && (
          <div>
            <dt className="font-medium text-slate-600">Text overlay</dt>
            <dd className="mt-0.5 text-slate-700">{scene.textOverlayNotes}</dd>
          </div>
        )}
      </dl>
      {scene.openArtPrompt && (
        <>
          <p className="mt-3 rounded bg-white p-2 text-xs text-slate-500">
            {scene.openArtPrompt}
          </p>
          <ImageGenerateBlock prompt={scene.openArtPrompt} />
        </>
      )}
    </div>
  );
}

type ImageProvider = "auto" | "gemini" | "pollinations";

function ImageGenerateBlock({ prompt }: { prompt: string }) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ base64: string; mimeType: string }[]>([]);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<ImageProvider>("auto");
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);
    setLastProvider(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), provider }),
      });
      const data = await res.json();
      const errMsg = data.error || data.detail;
      if (errMsg || !(data.images?.length)) {
        const show = [data.error, data.detail].filter(Boolean).join(" — ") || "No image was returned.";
        setError(show);
        setImages([]);
      } else {
        setImages(data.images);
        setLastProvider(data.provider ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-slate-500">Image generator</p>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as ImageProvider)}
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700"
        >
          <option value="auto">Auto (Gemini → Pollinations)</option>
          <option value="pollinations">Pollinations (free, no key)</option>
          <option value="gemini">Gemini (Nano Banana)</option>
        </select>
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate image"}
      </button>
      {lastProvider && (
        <span className="ml-2 text-xs text-slate-400">via {lastProvider}</span>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
      {images.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-600">Generated image(s)</p>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- base64 data URL
              <img
                key={i}
                src={`data:${img.mimeType};base64,${img.base64}`}
                alt={`Generated ${i + 1}`}
                className="max-h-64 rounded-lg border border-slate-200 object-contain shadow-sm"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SceneCard({
  title,
  scene,
  onCopy,
}: {
  title: string;
  scene: { title: string; description: string; openArtPrompt: string };
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <button
          type="button"
          onClick={onCopy}
          className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300"
        >
          Copy OpenArt prompt
        </button>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-600">{scene.title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
        {scene.description}
      </p>
      <p className="mt-2 rounded bg-white p-2 text-xs text-slate-500">
        {scene.openArtPrompt}
      </p>
      {scene.openArtPrompt && (
        <ImageGenerateBlock prompt={scene.openArtPrompt} />
      )}
    </div>
  );
}

