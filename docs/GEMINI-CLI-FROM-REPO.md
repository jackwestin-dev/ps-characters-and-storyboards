# Run Gemini CLI from the cloned repo

The [official Gemini CLI](https://github.com/google-gemini/gemini-cli) is cloned at **`gemini-cli-repo/`** in this project. Use these steps to install and run from source.

**Requirements:** Node.js 20+, enough free disk space (~500MB+ for `node_modules`).

---

## 1. Install and build (from repo root)

```bash
cd gemini-cli-repo
npm install
npm run build
```

If you see **"no space left on device"**, free disk space and run again.

---

## 2. Run Gemini CLI

**Option A — Development mode (from repo root)**

```bash
cd gemini-cli-repo
npm run start
```

**Option B — Use `gemini` command everywhere (linked install)**

```bash
cd gemini-cli-repo
npm link packages/cli
```

Then from any directory:

```bash
gemini
```

---

## 3. Set your API key

Use one of these before running the CLI:

```bash
export GEMINI_API_KEY="your_key_from_https_aistudio.google.com/apikey"
gemini
```

Or set it once via config (after first run the CLI creates `~/.gemini`):

```bash
npx gemini config set api-key YOUR_GEMINI_API_KEY
```

---

## 4. Optional: remove the clone

If you prefer the global npm install instead:

```bash
npm install -g @google/gemini-cli
```

Then you can delete the clone to free space:

```bash
rm -rf gemini-cli-repo
```

---

## Reference

- Repo: [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
- Docs: [geminicli.com/docs](https://geminicli.com/docs/)
- Installation (official): [docs/get-started/installation.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/installation.md) in the repo
