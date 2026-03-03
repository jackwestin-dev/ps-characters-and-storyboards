# Nano Banana (Gemini image) in Claude Code — troubleshooting

You're using **Nano Banana** (Gemini image generation) from **Claude Code** and seeing errors like "content generator not installed" or "not able to pull from Gemini" despite having an API key. Below is how to fix it.

---

## 1. Set the API key where Claude Code runs

Claude Code may run in a **different environment** (e.g. cloud or sandbox), so your local `.env.local` is often **not** used by skills.

- **In Claude Code / Claude.ai**
  - Go to **Settings → Capabilities** (or similar).
  - Look for **Environment variables** or **API keys** / **Manage API keys**.
  - Add:
    - **Name:** `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
    - **Value:** your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
  - Save and restart Claude Code if needed.

- **If you run Claude Code locally**
  - Export the key in the same shell you use to start Claude Code:
    - macOS/Linux: `export GEMINI_API_KEY='your-key'`
    - Or add that line to `~/.zshrc` / `~/.bashrc` and restart the terminal.

Skills usually expect **`GEMINI_API_KEY`** or **`GOOGLE_API_KEY`**; use one of those names.

---

## 2. "Content generator not installed"

This usually means one of:

- **The Nano Banana / image skill isn’t installed or enabled**
  - In Claude Code: **Settings → Capabilities → Skills** (or Plugin/Skill marketplace).
  - Install the **Nano Banana** (or Gemini image) skill/plugin from the marketplace, e.g.:
    - `nano-banana` skill, or
    - A plugin that mentions "Nano Banana" / "Gemini image generation".
  - Ensure the skill is **enabled** for your account/project.

- **A dependency the skill uses isn’t installed**
  - Some skills call an external **content generator** (e.g. a CLI or script). If the skill’s README or docs mention:
    - **nano-banana-cli:** install with `npm install -g @the-focus-ai/nano-banana-cli` (or the exact package name from the skill’s docs) so the `nano-banana` (or similar) command is on your PATH.
    - **Python / `google-generativeai`:** ensure the environment Claude Code uses has that package (e.g. `pip install google-generativeai` in that environment).
  - If the skill runs in a **sandbox**, the sandbox may need to have that CLI or Python package installed; check the skill’s documentation.

---

## 3. "Not able to pull from Gemini" (despite API key)

- **Key not visible to the skill**
  - Confirm the key is set in the **environment Claude Code (or the skill) actually uses** (see §1). Local `.env` or `.env.local` are often not loaded by cloud/sandbox environments.

- **Invalid or restricted key**
  - Create a **new key** in [Google AI Studio](https://aistudio.google.com/apikey) and replace the one in Claude Code. Ensure the key isn’t restricted in a way that blocks the Gemini API (e.g. IP or referrer restrictions).

- **Model name / region**
  - Some skills use a specific model (e.g. `gemini-2.5-flash-image` or `gemini-3-pro-image-preview`). If the skill allows configuring the model, try:
    - `gemini-2.5-flash-image` (often more widely available), or
    - The exact model name listed in the skill’s docs.

---

## 4. Use this app as a fallback

This repo’s **Character & Storyboard** app already has **Generate image (Gemini)** wired to your Gemini API key (in `.env.local`):

1. Run the app: `npm run dev` → open [http://localhost:3000](http://localhost:3000).
2. Generate a storyboard (or use an existing scene).
3. On any scene card, click **“Generate image (Gemini)”**.

That path uses the same Nano Banana–style image models (via `@google/genai`) and your key, so you can generate images here even if Claude Code’s skill is still failing.

---

## Summary checklist

- [ ] Set **GEMINI_API_KEY** (or **GOOGLE_API_KEY**) in **Claude Code’s** environment / API key settings, not only in `.env.local`.
- [ ] Install and **enable** the **Nano Banana / Gemini image** skill or plugin in Claude Code.
- [ ] If the skill requires a **content generator** or CLI, install that (e.g. nano-banana-cli or the Python lib) in the environment the skill runs in.
- [ ] Try a **new API key** and a model like **gemini-2.5-flash-image** if it still can’t pull from Gemini.
- [ ] Use this app’s **“Generate image (Gemini)”** as a working fallback while debugging Claude Code.
