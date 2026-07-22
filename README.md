# Weight Calc

Paste in multiple text sources (and optionally a topic/question), and get back the
most important points, ranked by weight. Weighting is done by Claude, based on how
corroborated a point is across your sources and how relevant it is to your topic.

## Structure

- `client/` — Vite + React + TypeScript + Tailwind CSS (UI only)
- `server/` — Node + Express + TypeScript (holds the Anthropic API key, calls Claude)

## Setup

```
npm run install:all
cp server/.env.example server/.env   # then edit server/.env and add your ANTHROPIC_API_KEY
npm run dev
```

This starts the server on `http://localhost:8787` and the client on `http://localhost:5173`
(the client dev server proxies `/api` requests to the server).

Open `http://localhost:5173`, paste in a few sources, optionally add a topic, and click Analyze.
