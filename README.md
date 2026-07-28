# NEON DROP

**One thumb. Zero excuses.**

NEON DROP is a fast, mobile-first arcade game. Drag the ball left and right,
thread the glowing gates, protect your three lives, and climb the global
leaderboard.

## Live website

https://neon-drop-game.galatsanos861185.chatgpt.site

## Gameplay

- Direct, smooth one-finger drag controls
- Three-life runs with forgiving onboarding gates
- Progressive speed and narrowing gaps
- Arcade music and responsive sound effects
- Persistent personal best and global leaderboard
- Full-screen layout designed for mobile browsers
- Shareable score challenges

## Tech

- React 19 and Next.js-compatible App Router
- vinext and Vite for Cloudflare Workers
- Cloudflare D1 for persistent global scores
- Canvas rendering and Web Audio—no game engine required

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Project structure

- `app/game.tsx` — game loop, controls, audio, scoring and UI
- `app/api/scores/route.ts` — leaderboard API
- `db/schema.ts` — D1 score schema
- `drizzle/` — database migration
- `public/og.png` — social sharing artwork

## Hosting note

The live game uses a server-side D1 leaderboard, so the production URL is
hosted on OpenAI Sites rather than static GitHub Pages. GitHub contains the
complete source and project history.
