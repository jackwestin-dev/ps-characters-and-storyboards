This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

- **ANTHROPIC_API_KEY** – for storyboard and character generation (Claude).
- **GEMINI_API_KEY** (or **GOOGLE_API_KEY**) – optional, for image generation via Gemini (Nano Banana). Get a key from [Google AI Studio](https://aistudio.google.com/apikey). You can also use **Pollinations** (no API key) from the image generator dropdown.

## Gemini CLI

The project includes [Gemini CLI](https://github.com/google-gemini/gemini-cli) as a dev dependency. Use it from the command line (with your API key set):

```bash
# Use API key from .env.local (run in the same shell before gemini)
export GEMINI_API_KEY=your_key_here
npm run gemini
# or
npx gemini
```

First-time setup: set your API key so the CLI can authenticate:

```bash
npx gemini config set api-key YOUR_GEMINI_API_KEY
```

Then run `npm run gemini` to start an interactive session.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy to Vercel (Production)

1. **Push your code to GitHub** (if you haven’t already).

2. **Import the project on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new).
   - Sign in with GitHub and choose **Import Git Repository**.
   - Select your repo and click **Import**.

3. **Set the root directory** (only if your repo root is the parent of this app)
   - If your GitHub repo contains a folder like `character-storyboard-app` and that’s where this Next.js app lives, set **Root Directory** to `character-storyboard-app` and leave **Override** unchecked so Vercel uses the app’s `package.json` and `next.config.mjs`.
   - If the repo root is already this app (no extra folder), leave Root Directory blank.

4. **Add environment variables**
   - In the import flow or after creation: **Project → Settings → Environment Variables**.
   - Add (see `.env.example` for reference):
     - **ANTHROPIC_API_KEY** – required for storyboard and character generation.
     - **GEMINI_API_KEY** or **GOOGLE_API_KEY** – optional; for Gemini image generation. Without it, the app can still use Pollinations for images.
   - Apply to **Production** (and Preview if you want them in PR previews).

5. **Deploy**
   - Click **Deploy**. Vercel will build and deploy. Future pushes to the default branch will trigger production deployments; other branches get preview URLs.
