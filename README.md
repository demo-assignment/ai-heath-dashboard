# Hearty · Health Insight Dashboard

A personal health dashboard with **Hearty**, a mascot and AI health buddy that answers questions about the user's own data.

- **Live demo**: https://ai-heath-dashboard-fe.vercel.app (sign in with `user / 123456`)
- **API**: https://ai-heath-dashboard-be.vercel.app/api

The repo has two apps:

- `frontend/`: React 19 + TypeScript + Redux Toolkit + Tailwind CSS (Vite)
- `backend/`: Hono (TypeScript) API that serves the health data and streams answers from the LLM

---

## 1) Features

- **Demo sign-in**: `user / 123456`. Salted scrypt password verification on the server, signed HttpOnly session cookie (8 hours), protected health/chat routes, and logout. One shared demo account, not registration or multi-user storage.
- **Name-based avatar** using `boring-avatars` (SVG generated locally, no avatar API).
- **Health dashboard** for a fictional user (Long Phan, 25, desk job, 8 weeks into a wellness plan)
  - Hero card with a plain-language weekly summary from Hearty and a plan timeline
  - Bento grid where each goal has its own visual: steps (sunrise, 7-day bars), sleep (night card with the last 7 nights), weight (a journey bar from start to goal), water (a wave filled to today's level), protein, active minutes
  - "Hearty's tips": the 3 biggest gaps this week, with a concrete suggestion for each
  - Steps chart (28 days or 8 weeks), resting heart rate and weight trends, recent workouts
  - Missing days are shown as gaps, not as zero
- **Add data** ("+ Add data" in the top bar)
  - **Log a day**: a form for one day, with the same limits the server uses. Days you added before can be edited
  - **Upload Excel**: import many days from an `.xlsx` file that must match the template exactly. After choosing a file, a row-by-row preview (New / Skipped / Error) is shown before anything is saved. One bad row rejects the whole file and every problem is listed by row and column. Template and two sample files are included
  - Days up to the last device sync are final, so older rows are skipped; future dates are rejected
  - New data updates the dashboard and Hearty's answers right away
  - **Connect a device (coming soon)**: shown in the dialog to make the product direction clear. Not implemented: real syncing would go through Apple HealthKit / Android Health Connect in a mobile app or vendor APIs (Garmin, Fitbit) with OAuth
- **Edit profile** (click your name in the top bar): name, age, sex, height, occupation, diet and the six goals. The greeting, goal cards, focus tips and Hearty's prompt all use them right away. Start weight and the goal date stay fixed because they belong to the recorded data. "Reset to sample data" brings back the fictional persona
- **Hearty, the mascot**: a heart wearing a sports headband, drawn as one SVG component. It "beats" gently and its face follows the data (proud, sleepy, thinking, concerned, waving)
- **AI health assistant** (bottom-right, "Ask Hearty")
  - Answers stream in token by token (Server-Sent Events)
  - **Tool calling**: Hearty looks up specific days, compares periods and lists workouts by calling functions on the server, and shows what it looked up under the answer
  - Suggested questions, Stop, Regenerate and Retry on the latest answer
  - **Conversation history**: New chat, reopen a saved conversation (including charts/sources), and delete with confirmation. The backend resolves conversationId from the authenticated account, not a browser-supplied message history
  - Warns when the answer contains numbers that can't be found in the user's data
- Responsive layout, with loading, error and empty states for the dashboard and the chat
- **Read-only fallback during an authenticated visit**: the last dashboard that loaded is kept in `localStorage`. If the server can't be reached, the app shows that copy with a banner ("Showing your data saved on …"), retries when the tab gets focus or the network comes back, and only shows the dashboard error screen when nothing was saved yet. On a fresh page load, the server must confirm the session first; a failed session check does not unlock cached data. A 401 never uses the cache

---

## 2) Tech stack

| Part | Choice | Why |
| --- | --- | --- |
| UI | React 19, TypeScript | Required by the brief |
| State | Redux Toolkit | Required by the brief. Two slices: `dashboard` and `assistant` |
| Avatar | boring-avatars | Deterministic SVG from the profile name, no network request |
| Auth | Node crypto: scrypt + HMAC | No extra auth library for the one-account demo; HttpOnly cookie |
| Styling | Tailwind CSS v4 | Fast to build, no runtime CSS |
| Charts | Small SVG components I wrote (`components/charts`) | Only bar, line and ring charts are needed, so a chart library would add more weight than value |
| Mascot | One SVG component with moods (`components/mascot`) | No image files, scales to any size, animated with CSS, respects reduced motion |
| Fonts | Bricolage Grotesque (numbers, titles) + Figtree (text) | Big, friendly numbers that are easy to read at a glance |
| Build | Vite | Fast dev server, simple proxy to the API |
| API | Hono | Express-style routing, zero dependencies, built-in SSE helper, deploys to Vercel with no config |
| LLM | Groq (`openai/gpt-oss-120b`) by default, Gemini as a preset, or any OpenAI-compatible API | Groq is very fast (~500 tokens/s), so streaming feels instant. Both have a free tier. Switching is only an env change |

No LLM SDK is used. The backend calls the API with `fetch` and parses the stream itself (`readChatStream` in `llm.service.ts`).

---

## 3) Project structure

```
frontend/src
├── api/                 fetch wrapper + endpoints
├── app/                 Redux store and typed hooks
├── components/          shared UI: Card, charts, icons, loading/error/empty states, WillRender
├── modules/
│   ├── dashboard/       Dashboard page, dashboardSlice, section components
│   └── assistant/       chat widget, assistantSlice, useChatStream, markdown renderer
├── services/            health.service.ts, chat.service.ts (SSE)
├── types/
└── utils/               sse parser, formatting

backend/src
├── data/                health-data.json (sample data), entryStore.ts (manual entries), index.ts (merge)
├── routes/              health.route.ts (dashboard, entries, import), chat.route.ts
├── services/            insights, llm, tools, import (Excel), mockLlm
├── prompts/             healthAssistant.prompt.ts
├── utils/               grounding check, request validation, math helpers
├── middlewares/         rate limit
├── tests/               node:test unit tests + Excel fixtures
scripts/                 generateData.ts (npm run seed), generateSamples.ts (npm run samples)
├── index.ts             Hono app (Vercel entry)
└── server.ts            local Node server
```

---

## 4) Run locally

Requirements: **Node.js 20.19+** and npm.

### 4.1. Backend

```bash
cd backend
npm install
cp .env.example .env    # then add your LLM_API_KEY (Groq by default)
npm run dev
```

API runs at `http://localhost:3001/api`.

Get a free Groq key at https://console.groq.com/keys (or set `LLM_PROVIDER=gemini` and use a key from https://aistudio.google.com/apikey). No key yet? Set `LLM_MOCK=true` to try the UI with a fake streamed answer.

### 4.2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. In dev, Vite forwards `/api` to the backend, so no CORS setup is needed.

### 4.3. Regenerate the sample data (optional)

```bash
cd backend
npm run seed      # src/data/health-data.json
npm run samples   # Excel template + samples in frontend/public/samples and the test fixtures
```

Both are TypeScript scripts run with `tsx`, same as the backend.

### 4.4. Tests and type check

```bash
cd backend && npm test && npm run typecheck     # 74 tests: auth, conversations, tools, charts, Excel import, validation, prompt rules, stream parser, grounding
cd frontend && npm test && npm run typecheck    # 33 tests: auth, conversations, SSE parser, event handling, chat reducer, offline cache, formatting
```

Both use Node's built-in test runner (`node:test`) through `tsx`, so there's no extra test framework.

Formatting uses Prettier with the shared `.prettierrc` (print width 120, `arrowParens: avoid`, trailing commas). Run `npm run prettier` to format or `npm run prettier:check` to verify, in either app.

The backend also has `npm run test:runtime`: it compiles with TypeScript NodeNext, then imports the emitted JavaScript using plain Node (no tsx/bundler) and checks API/auth/dashboard/history/chat with the mock LLM. This catches deployment-only ESM import errors that tsx can hide. The smoke test does not call a real LLM or require a provider key.

CI (`.github/workflows/ci.yml`) runs typecheck and tests for both apps on every push to `main` or `master` and on pull requests, plus production builds for both apps and a native Node runtime smoke test for the backend. Tests don't need an API key or network: the LLM is replaced by a fake stream and the Excel files are fixtures in `backend/src/tests/fixtures`.

---

## 5) Environment variables

### Backend (`backend/.env`)

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `LLM_API_KEY` | Yes (unless mock) | | API key for the LLM provider |
| `LLM_PROVIDER` | No | `groq` | `groq` or `gemini`. Sets the default base URL and model |
| `LLM_BASE_URL` | No | provider default | Any OpenAI-compatible base URL (OpenAI, OpenRouter, ...) |
| `LLM_MODEL` | No | `openai/gpt-oss-120b` (groq), `gemini-flash-latest` (gemini) | Model name |
| `LLM_REASONING_EFFORT` | No | empty | e.g. `low` for a faster first token on reasoning models like gpt-oss. Leave empty if the model rejects it |
| `ALLOWED_ORIGINS` | In production | `http://localhost:5173` | Exact comma-separated frontend origins; wildcard is not accepted with session cookies |
| `SESSION_SECRET` | In production | Local-only fallback | Random secret of at least 32 characters for HMAC sessions. Stable across backend instances. Never expose it with a VITE_ prefix |
| `RATE_LIMIT_MAX` | No | `20` | Chat and health-write requests per IP per window |
| `RATE_LIMIT_WINDOW_MS` | No | `600000` | Rate limit window (10 min) |
| `APP_TIMEZONE` | No | `Asia/Ho_Chi_Minh` | Decides what "today" is when logging data |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | No | | Keep added days in Upstash Redis. Without them, added days live in memory |
| `PORT` | No | `3001` | Local dev only |
| `LLM_MOCK` | No | `false` | `true` returns a fake streamed answer. For local UI work only |

### Frontend (`frontend/.env`)

| Name | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | In production | Backend URL, e.g. `https://health-insight-api.vercel.app`. Leave empty locally |

API keys only live in the backend. `.env` files are git-ignored.

---

## 6) Deploy (Vercel, free plan)

Create two Vercel projects from this repo:

1. **Backend**: Root Directory `backend`. Vercel detects Hono from `src/index.ts`. Add `LLM_API_KEY`, `SESSION_SECRET` (random, at least 32 characters) and `ALLOWED_ORIGINS` (frontend origin). `LLM_MODEL` is optional.
2. **Frontend**: Root Directory `frontend`. Vercel detects Vite. Add `VITE_API_URL` = backend URL (without `/api`). Redeploy after changing it, because Vite bakes it into the build.
The backend source uses explicit `.js` relative import specifiers (and `/index.js` for directory entrypoints), even though the source files are `.ts`. TypeScript resolves these during development and Node resolves them after compilation. JSON imports use `with { type: "json" }`. Keep the Vercel Hono preset and its default output settings; do not point its Output Directory to `dist` as if it were a static frontend.

3. Set `ALLOWED_ORIGINS` on the backend to the exact frontend origin and redeploy.
4. Test sign-in, refresh and logout on the deployed site. Production cookies use HttpOnly + Secure + SameSite=None for cross-origin hosting. Browsers that block third-party cookies can reject sessions between unrelated sites (including separate *.vercel.app projects). Prefer frontend/backend under the same site with custom subdomains, or a same-origin API reverse proxy. The repo does not automatically configure that proxy. Local development uses the Vite same-origin proxy and SameSite=Lax.

---

## 7) Data model and data input

### Shape

```
HealthData
├── persona        name, age, height, occupation, diet, program start...
├── goals          daily steps, weekly active minutes, sleep, protein, water, start/target weight + date
├── notTracked     things the app doesn't measure (blood pressure, labs...) so the UI and AI can say so
├── daily[]        one record per day: steps, activeMinutes, sleepHours, restingHeartRate,
│                  caloriesIn, proteinG, waterL, weightKg  (any value can be null)
└── workouts[]     date, type, duration, distance, calories
```

Decisions:

- **Store raw daily values, calculate everything else.** Weekly totals, averages, goal progress and focus areas are computed in `insights.service.ts` on each request. Nothing derived is stored, so it can't get out of sync.
- **Missing is `null`, never 0.** A day without a sync is a gap in the charts and is left out of averages. Walking 0 steps and not wearing the band are different things.
- **Weight is weekly**, so most days have `weightKg: null` by design.
- **Fictional but realistic.** `scripts/generateData.ts` (`npm run seed`) creates the 8 weeks with a small seeded random generator, so it gives the same file every run, with a story built in (steps improving, short sleep on weekdays, a deadline week, two days without sync).

### Adding data

Device data is read-only. Days the user adds are stored separately and merged on read (`data/index.ts`):

```
sample data (device, up to 18 Oct)  +  manual entries (19 Oct → today)  →  one continuous list of days
```

- Gaps between the last sync and a new entry become empty (`null`) days, so weeks stay aligned and gaps stay visible.
- **Rules, shared by the form and the import** (`utils/validateEntry.ts`): real `YYYY-MM-DD` date, numbers only, whole numbers where it makes sense, value ranges (e.g. sleep 0–24 h), at least one value per day.
- **Date window:** after the last device sync and up to today in `APP_TIMEZONE`. Earlier days are final; future days don't exist yet.
- **Excel import is strict and all-or-nothing** (`services/import.service.ts`): row 1 must be exactly the template columns, max 100 rows, no duplicate dates, every cell valid. One problem rejects the file and the response lists every problem by row and column. Rows on or before the last sync are skipped with a reason, not treated as errors.
- The server parses and validates the file itself (`read-excel-file`). The browser only uploads it.
- Storage is behind a small interface (`data/entryStore.ts`): in memory by default, or Upstash Redis when its env vars are set. Swapping in Postgres later only means adding another implementation.

### API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Verify demo credentials and set HttpOnly session cookie |
| GET | `/api/auth/me` | Restore the current session |
| POST | `/api/auth/logout` | Expire the session cookie |
| GET / POST | `/api/conversations` | List or create conversations for the authenticated account |
| GET / DELETE | `/api/conversations/:id` | Load or delete one owned conversation |
| GET | `/api/health/dashboard` | Dashboard data (sample + added days, with all calculations) |
| POST | `/api/health/entries` | Add or replace one day (JSON) |
| POST | `/api/health/import/preview` | Check an `.xlsx` file and return a row-by-row preview. Saves nothing |
| POST | `/api/health/import` | Import an `.xlsx` file (multipart, field `file`) |
| PUT | `/api/health/profile` | Update name, details and goals |
| DELETE | `/api/health/entries` | Remove added days and profile edits, back to the sample data |
| POST | `/api/chat` | Ask the assistant (SSE stream) |

---

## 8) Architecture

### Authentication

1. FE sends username/password over HTTPS to POST /api/auth/login. It does not pre-hash the password: a client hash would itself become a reusable credential.
2. BE derives a 64-byte scrypt key with the stored salt and compares it with the stored hash using timingSafeEqual. The fixed demo record stores only the salt/hash, never a plaintext password. The UI intentionally shows the public demo password.
3. BE signs a session payload (user id, expiry, nonce) with HMAC-SHA256 and sets an HttpOnly cookie. The payload is signed, not encrypted; it contains no password or health data.
4. FE restores the session with GET /api/auth/me. API and chat requests include credentials; middleware verifies the signature and expiry before reading private routes.
5. POST /api/auth/logout expires the cookie; FE clears Redux conversation/dashboard and localStorage. Late responses are discarded after a session change.

The session is stateless: signing keys must be stable across instances. Logout removes the browser cookie but does not revoke a copied cookie on the server; it remains valid until expiry or key rotation. Login has a separate in-memory limit (10 attempts per 10 minutes/IP). Credentialed writes validate Origin; CORS is configured with exact origins. These are demo safeguards, not production-grade identity management.


```
Browser (React + Redux)                    Hono API                         LLM provider
───────────────────────                    ────────                         ────────────
Dashboard ── GET /api/health/dashboard ──▶ insights.service
                                           (weekly totals, goal progress,
                                            focus areas, missing days)
            ◀─────────── JSON ────────────

Assistant ── POST /api/chat ─────────────▶ validate + rate limit
            { conversationId, message }     build system prompt from the
                                           same insights as the dashboard
                                           ── stream: true, tools ────────▶
                                           ◀── tool_calls (e.g. 3 Oct) ─────
            ◀── SSE: status ────────────── run the tool in code
                                           ── tool result ────────────────▶
            ◀── SSE: delta … ───────────── ◀── answer tokens ───────────────
            ◀── SSE: meta, done ────────── grounding check on the full answer
```

Main decisions:

- **One source of truth.** The dashboard and the assistant both read from `getDashboard()`. The assistant can't disagree with the numbers on screen.
- **The server builds the LLM context.** The browser sends a conversationId and the current question, not a system prompt or a history array. The backend loads owned history and health data. User edits still change that health data through validated APIs; this is not a claim that the data is immutable.
- **Typed SSE events, one per kind of content.** Every message has an `event:` name and the same `type` inside its JSON: `status`, `delta` (text), `chart`, `meta`, `done`, `error`. The frontend has one handler per type and ignores messages where the two don't match, or types it doesn't know, so new blocks (a table, a code snippet, an image) can be added on the server without breaking older clients.

  Example stream for "How has my sleep been this week?":

  ```
  event: status
  data: {"type":"status","label":"Drawing a chart…"}

  event: chart
  data: {"type":"chart","chart":{"type":"bar","title":"Sleep","unit":"h","goal":7.5,"points":[...]}}

  event: delta
  data: {"type":"delta","text":"Your sleep "}
  ... more delta events ...

  event: meta
  data: {"type":"meta","truncated":false,"unverifiedNumbers":[],"sources":["Sleep chart, 12 Oct – 18 Oct"]}

  event: done
  data: {"type":"done"}
  ```
- **Server-Sent Events over `fetch`.** The answer only flows one way, so SSE is enough. I read it with `fetch` instead of `EventSource` because I need a POST body.
- **Errors before and after the stream.** Errors before the stream starts (bad key, rate limit) return a normal HTTP status. Once the stream has started the status is already 200, so errors arrive as an `error` event. If the stream ends without `done`, the frontend treats it as interrupted.
- **Stop really stops.** The frontend aborts the request, Hono notices the disconnect, and the backend aborts the call to the LLM so no more tokens are paid for.
- **Smooth streaming.** Chunks are collected in a ref and committed to Redux once per animation frame. Message components are memoized, so only the answer being written re-renders.

---

## 9) Product decisions

**Who it's for.** Someone who isn't a data person and opens the app for 30 seconds. So the page answers three questions in order:

1. **How am I doing?** A one-paragraph summary at the top, written from the data.
2. **Am I hitting my goals?** Six goal cards with this week vs goal and change vs last week.
3. **What should I do next?** "What to focus on" ranks the gaps and gives one practical action each.

Charts come after that, for people who want to dig in.

Other choices:

- **A mascot that is honest.** Health apps often feel clinical or guilt-driven. Hearty makes the app friendlier, but its mood comes from the data (`getMascotMood`): it only looks happy when most goals are on track, looks sleepy on the sleep card, and "thinks" while the AI is answering. It never cheers for numbers that aren't good.
- **Each metric looks different.** Most dashboards are a grid of identical cards. Here each goal has a visual that matches what it measures (a night sky for sleep, a water level for hydration, a road to the finish flag for weight), so users recognise them without reading labels.

- **Rule-based advice on the dashboard, AI in the chat.** The focus areas are plain rules, so the same data always gives the same advice and it can be tested. The AI is for follow-up questions where flexibility helps.
- **Weight is judged by pace, not by the final number.** Long has lost 2.2 of 4.8 kg after 8 of ~18 weeks, so he's on pace, even though he's only at 46% of the goal. Showing "behind" here would be wrong and discouraging.
- **Colours mean direction.** Green when a change is good for that metric (weight going down is good, steps going down is not).
- **Missing data is visible.** Two days with no sync are grey in the charts and are left out of averages, instead of counting as zero.
- **Honest scope.** The footer and the assistant both say what isn't tracked (blood pressure, labs, medications...). No diagnosis, and the assistant points to a doctor for anything that sounds urgent.

---

## 10) LLM and prompt approach

### How the data reaches the model

`prompts/healthAssistant.prompt.ts` turns the dashboard data into a compact text block inside `<health_data>` tags:

- profile and goals
- current week vs each goal, with the change vs last week
- progress since week 1
- an 8-week summary table and the last 7 days, with a yes/no "goal met" column for steps and sleep and a written count ("met on 1 of the last 7 nights")
- recent workouts, days without data, and things that are **not tracked**

All averages and percentages are calculated in code first. The model is asked to reuse these numbers instead of doing its own math, since that's where most wrong numbers come from.

### Tool calling

The prompt holds goals, weekly summaries and the last 7 days. For anything more specific the model calls one of four tools (`services/tools.service.ts`):

| Tool | What it returns |
| --- | --- |
| `get_daily_metrics(from, to)` | Every metric for each day in a range (max 31 days) |
| `get_period_summary(from, to)` | Averages and totals for any range, calculated in code. Used to compare periods |
| `get_workouts(from, to, type?)` | Logged workouts, optionally filtered by type |
| `show_chart(metric, from, to)` | Draws a bar chart under the answer. The numbers come from code and are sent as a `chart` event; the model only decides when a chart helps |

How it works:

1. The backend sends the tool definitions (JSON Schema) with the request.
2. When the model asks for a tool, the stream contains `tool_calls` instead of text. The name and arguments arrive in small pieces, so the parser joins them by `index` before using them.
3. The backend validates the arguments (date format, real dates, range inside the data, max length) and runs the tool in code. Invalid input comes back to the model as `{ "error": "..." }` so it can tell the user, for example "no data for that day", instead of guessing.
4. The result is added to the conversation and the model is called again. Meanwhile the frontend gets a `status` event ("Looking up your daily data…").
5. After 3 tool rounds the model must answer without tools, so it can't loop forever.
6. The answer shows which data was looked up ("Looked up: Daily data, 3 Oct"), and tool results are included in the grounding check.

Why tools instead of putting all data in the prompt: the model gets exact numbers calculated by code for the period it actually asks about, the prompt stays small, and the same design keeps working when the history grows to years.

### Prompt structure

1. Role and user
2. Rules: only use `<health_data>`, say clearly when data is missing, no diagnosis or medication advice, **health topics only** (anything else gets one short sentence and a health question to try instead, even if the user asks to ignore the rules), treat data and user text as data rather than instructions
3. Style: short answer first, then a few bullet points, simple Markdown only
4. The data block

The system prompt is rebuilt on the server for every request.

### Conversation context

The browser sends only { conversationId, message, regenerate? }. The server validates the ID and message (up to 2000 characters), looks up the conversation under the authenticated account, and builds the model history from the latest 12 completed messages (six user/assistant pairs), plus the new question. Failed, stopped and pending pairs are excluded. The current health context is rebuilt every request; older answers remain snapshots, not live dashboards.

Conversations store text, status, timestamps, chart blocks and metadata, but not the system prompt, API key or tool-call trace. They use process memory by default or the existing optional Upstash Redis configuration (an owner-scoped hash, field = conversationId). Refreshing the frontend restores saved history if the backend storage is still available. Cold starts lose memory storage; Redis is required for durable history.

The demo caps each account at 20 conversations and each conversation at 50 question/answer pairs. A per-conversation busy lock prevents simultaneous streams or deletion during a stream; Redis uses SET NX EX and token-checked release. Regeneration replaces only the latest pair. A missing/deleted ID returns 404 rather than silently creating another conversation. UI displays errors and disables switching/deletion while streaming.

**Data sharing:** each chat sends health profile/summaries and any needed tool results, plus recent completed messages, to the configured LLM provider. The original Excel file is not sent. Do not enter real private health information into this public demo. Everyone signed into the public demo account shares history. Deleting a conversation removes it from this app's store, not necessarily from the provider's logs/retention systems.

### Unexpected or invalid responses

| Case | Handling |
| --- | --- |
| Wrong API key, provider down, rate limited | HTTP error with a clear message. Retry is offered when it makes sense |
| Request takes longer than 60s | `LLM_TIMEOUT` error |
| Malformed chunk in the stream | Skipped and logged, the rest of the answer continues |
| Provider sends an error mid-stream | `error` event, partial text is kept, user can retry |
| Empty answer | `LLM_EMPTY_RESPONSE` error instead of an empty bubble |
| Answer cut by the token limit | Shown with a note: "The answer was cut short" |
| Connection drops | Frontend notices the missing `done` and shows "interrupted" with Retry |

The answer is rendered with a small Markdown renderer that builds React elements, so model output can't inject HTML.

### Reducing made-up information

1. The model only gets this user's data, and the rules say to use nothing else.
2. Numbers are pre-calculated, so there's little reason to compute new ones. This includes counts: whether each day met a goal, and how many days did, is written into the data and returned by tools (`goalMet`, `goalMetCount`). In live testing the model once said two nights met a 7.5 h sleep goal when one night was 7.2 h; the rule now is to copy these counts, never count rows.
3. The prompt lists what is **not tracked**, so "What's my blood pressure?" gets "the dashboard doesn't have that" instead of a guess.
4. Low temperature (0.3).
5. **Grounding check** (`utils/grounding.ts`): after the answer is complete, the backend looks for numbers in the answer that don't appear in the data, tool results or the user's question. If it finds any, the UI shows a small note ("Not from your data: …"). These are often harmless general guidance, so the note informs rather than alarms. It's a cheap safety net, not proof: a real number can still be used in the wrong sentence.
6. The prompt asks for general tips in words ("a portion of salmon") instead of precise figures from general knowledge, which keeps answers about the user's own numbers.

---

## 11) Trade-offs and next steps

- **Sample data is a JSON file and added days are in memory by default.** On Vercel, memory resets when a new instance starts, so set the Upstash env vars to keep added days. A real product would use Postgres with a table per user and day.
- **Offline copy is read-only.** Adding data, editing the profile and Hearty need the server. The copy is versioned (`hearty:dashboard:v1`) so an old shape is ignored after an update, and "Reset to sample data" clears it. Health data in `localStorage` is fine for a demo; logout and session expiry clear it. A real app would also let the user disable local health-data caching.
- **One public demo account.** Login demonstrates the authentication flow, not private multi-user isolation. Conversation storage is scoped to the account ID, but the account itself is shared. Everyone using `user / 123456` still shares Long Phan's profile and added days. Logout clears browser state, not server health data. A real product would resolve the authenticated user to their own store key.
- **Text from the profile goes into the AI prompt**, so the server trims it, limits its length and removes new lines and `<>` before saving.
- **Rate limit is in memory**, so it resets per serverless instance. Good enough to protect the demo's free quota, not for production.
- **Types are duplicated** in `frontend/src/types` and `backend/src/types` to keep the two apps separately deployable. A shared package would fix that.
- **Tool rounds run one after another**, so a question that needs tools takes one extra LLM call. Fine with a fast provider like Groq.
- **Next**: add an evaluation set of questions with expected facts (including tool usage), add genuinely separate accounts/data ownership and a configurable history-retention policy.

---

## Note on the data

The persona and all health data are fictional, created for this test with `npm run seed` in `backend/`. The Excel template and samples come from `npm run samples`. To try the import, use the files in `frontend/public/samples/` (also downloadable from the Upload Excel tab).
