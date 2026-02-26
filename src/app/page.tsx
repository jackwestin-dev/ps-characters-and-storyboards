"use client";

import { useState } from "react";
import { STICK_FIGURE_STYLE_GUIDE } from "@/types/character";
import type { StoryboardOutput } from "@/types/storyboard";

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
    <section className="space-y-6">
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
    </section>
  );
}

function StoryboardSection() {
  const [file, setFile] = useState<File | null>(null);
  const [characterBlock, setCharacterBlock] = useState("");
  const [result, setResult] = useState<StoryboardOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!file) {
      setError("Choose a PDF file.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    if (characterBlock.trim()) form.append("characterBlock", characterBlock.trim());
    try {
      const res = await fetch("/api/storyboard", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate storyboard");
      setResult(data);
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
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Textbook → Start / End scenes + storyboard
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a textbook PDF. You get start and end scenes plus a full
          storyboard, formatted for OpenArt.ai.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          PDF file
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Character block (optional)
        </label>
        <textarea
          value={characterBlock}
          onChange={(e) => setCharacterBlock(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="Paste the character block from the Character tab to keep the same character in every scene."
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Generating storyboard…" : "Generate storyboard"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">{result.title}</h3>

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
        </div>
      )}
    </section>
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
    </div>
  );
}
