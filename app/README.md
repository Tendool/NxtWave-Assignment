# Build60 — registration + referral engine

Campaign site for the free workshop **"Build Your First AI Project in 60 Minutes"**.
Goal: 500 registrations from final-year engineering students in 7 days on a ₹2,000 budget.

## What's in it

| Route | What it does |
|---|---|
| `/` | Landing page, live seat meter, registration form with searchable college picker. `?ref=CODE` credits a referrer, `?src=TAG` tags a channel. |
| `/thanks/[code]` | Confirmation, *Join the WhatsApp group* + add-to-calendar, personal referral link, one-tap share, own rank, progress towards referral rewards. |
| `/leaderboard` | College and top-referrer standings (names shown as "Ananya R."). |
| `/kit` | Ambassador kit: tracking link + 3 forwardable WhatsApp messages (AI-written if a key is set). |
| `/evaluate` | After the workshop: submit live link + repo, get a rubric score and 3 fixes. |
| `/gallery` | Submitted projects ranked by score. |
| `/admin` | Password-protected dashboard: campaign settings (date, WhatsApp link), growth vs. 500, plan-vs-actual per channel, visitors → registrations per `?src=` tag, states, CSV export, review of student-added colleges. |
| `/workshop.ics` | Calendar file with a 30-minute reminder (Apple Calendar, Outlook). The thanks page also links to Google Calendar. |
| `/api/colleges?q=` | College typeahead, searched in Postgres so the 560-college list never ships to the browser. |
| `/challenge` | The timed challenge. After registering or sharing, students are asked to start their timer, then see their question, a server-enforced countdown and a submission form. |
| `/admin/assessments` | Write/upload a question, generate N variants with AI, or generate a unique one per student; assign at random. |
| `/admin/submissions` | Every student's repo, zip, hosted link, video and notes, with the funnel (registered → started → submitted → scored). |
| `/admin/scores` | Scores given by the AI reviewer: per-criterion breakdown, per-variant averages, CSV export. |
| `/admin/ai` | Choose the AI model: a local one (Qwen, Llama, Gemma… via Ollama / LM Studio) or a hosted API key. |

The site opens in light mode for everyone, regardless of the device setting; the header toggle switches to dark and the choice is remembered.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest: pure rules + a throwaway in-memory Postgres
```

No database setup needed. With `DATABASE_URL` unset, development uses **PGlite** — a real embedded
Postgres stored in `.data/pg` — and runs the same migrations as production. Open `/admin`
(password `admin` in dev). It starts empty: register on the landing page to see the funnel fill up.

## Database

One Postgres schema (`src/db/schema.ts`, Drizzle ORM). The core tables:

- **`colleges`** — reference table seeded with ~560 Indian engineering colleges (`src/db/colleges-data.ts`): IITs, NITs, IIITs, central/state universities and major private colleges, with city, state/region and type. A college a student types that isn't listed is stored as `verified = false` and shows up on the admin dashboard to approve.
- **`registrations`** — FK to `colleges`, self-referencing FK for referrals (`referred_by_id`), enums for branch/year.
- **`evaluations`** — project submissions with a JSONB score breakdown, optionally linked to a registration.
- **`visits`** — one row per browser per day per `?src=` tag (a random httpOnly cookie id, nothing personal), so the dashboard can show conversion per channel.

Integrity is enforced by the database, not just the app: unique `lower(email)`, unique WhatsApp, unique referral code,
a `CHECK` that the number is a valid Indian mobile, a `CHECK` against self-referral, scores constrained to 0–100,
and indexes on every join and sort column. Row-level security is enabled on every table with no policies, so even
on Supabase the public REST API cannot read contact details — only the server's direct connection can.

Migrations live in `drizzle/` and are applied automatically (under a Postgres advisory lock, so concurrent serverless
cold starts can't race). After changing the schema: `npm run db:generate`, commit the new SQL file.

## Deploy (all free tiers)

1. Create a Postgres database (Supabase, Neon, …) and copy its **pooled** connection string.
2. Import the repo in Vercel, set **Root Directory** to `app`.
3. Set env vars from `.env.example`: `DATABASE_URL`, `ADMIN_PASSWORD`, optionally `ANTHROPIC_API_KEY`.
4. First request creates the tables and seeds the colleges. Production refuses to start without `DATABASE_URL`.

## The challenge

1. **Share, then start.** After registering, the thanks page offers WhatsApp, LinkedIn, X, Instagram, Telegram, Facebook, email and the phone share sheet (Instagram has no web share link, so it copies the link and opens the app). Each click is logged. When the student returns from sharing they are asked *"Start your timer?"*; a *Start the challenge* button is always visible too, so sharing is encouraged but never a gate.
2. **Timer.** The deadline is stored server-side when they confirm. The countdown on screen follows the server's clock, and the server rejects submissions after the deadline (plus a 90 s grace).
3. **Submit.** A GitHub repo link and/or a zip, optionally a hosted link and a demo video (link or file). The assessment says which are required.
4. **Scoring.** After submission the configured model scores five criteria (works, meets the brief, use of AI, code, presentation) against the question *that student was given*; a hosted link's "works" score is measured, not judged. Without a model it falls back to a basic check.

**Identity.** The referral code is public (it is in every shared link) so it never identifies anyone. Each registration has a private access token in an httpOnly cookie; only that cookie can start or submit. On a new device, entering the registered email **and** WhatsApp number restores access.

**Assessments.** In `/admin/assessments` you can write a question or upload a `.md`/`.txt` (plus an optional PDF/zip attachment), have the AI write one or *N* variants (each in a different domain, told the titles already used, so they test the same skills in different scenarios), or switch to *unique for every student*, which generates a fresh question when each student presses start and falls back to the pool if the model fails. Generated questions must be self-contained: one that refers to a "provided dataset", an "attached CSV" or "the repository" (students are given nothing but the text) is rejected and regenerated. Pool variants are handed out least-assigned-first with random tie-breaks, so they stay balanced. The Scores page shows each variant's average so you can spot an easier or harder one.

**Uploads** are stored in Postgres (no extra storage service), checked by extension and magic bytes, and served only to the admin with a server-chosen content type. The size cap is `MAX_UPLOAD_MB` (default 25 locally, **4 on Vercel**, whose functions reject larger bodies) — for bigger files students should share a link.

## Before launch

- **`/admin` → Campaign settings:** set the real workshop date and paste the WhatsApp group (or channel) invite link. No redeploy needed. Until a link is set, the thanks page asks students to add the session to their calendar instead.
- **`src/lib/constants.ts`:** `REWARD_TIERS` and `TOP_PRIZES` are what referrers are promised (the vouchers are ₹1,000 of the ₹2,000 budget). `HOST` adds a "Your host" block to the landing page once `name` is filled in — use the real person.

## Tests

`npm test` runs Vitest. `tests/pure.test.ts` covers the calendar file, settings validation, reward tiers, the generated-question check and the grading rules (quote verification, disagreement flags). `tests/db.test.ts` runs against an in-memory PGlite with the real migrations: duplicate and partial-match registrations, referral and self-referral, the mobile-number `CHECK`, college search, the server-side deadline and grace period, and visit de-duplication.

## Share cards (the growth loop)

- **Referral link preview.** Every `/?ref=CODE` link unfurls (WhatsApp, LinkedIn, X, Telegram…) into a card reading *"Meera from VIT Vellore is building a first AI project — join the free workshop"*, with the live seats-left meter. It's generated per request at `/og/ref/[code]`; a missing or unknown code falls back to a generic card. Cards use only a first name and a college (both already public on the thanks page) and **no pronouns**.
- **Story image.** `/og/ref/[code]?format=story&download=1` is a 1080×1920 PNG for Instagram, which has no web share link.
- **Proof-of-work card.** After a submission is scored the student can press *Create my result card*. That mints a random public id, a public page at `/proof/[slug]`, and a 1200×630 / story image showing the project, time taken and score. **Nothing about a result is public until the student presses the button.** The page's call to action is `/?ref=<their code>&src=proof`, so anyone it brings in is credited to them — registrations feed the challenge, and the challenge feeds registrations.

## Trustworthy grading

LLM grading is only useful if you can tell when it's wrong. Challenge scoring is built around that:

- **A reviewer panel.** In `/admin/ai`, add an optional *second reviewer model* (same provider). Each reviewer scores independently, one after the other; the consensus is the per-criterion mean.
- **Grounded evidence.** Every score must cite a short quote copied *exactly* from what the student submitted. The server checks each quote against the real text (README, page text, zip contents, repo files, notes, plus the JSON the model was shown) and marks it ✓ found or ✗ not found. Commentary, paraphrase, spliced "…" quotes and lines copied from the brief are rejected.
- **Disagreement flag.** A total gap of 12+ points, a 8+ gap on any criterion, or any reviewer whose evidence is mostly unverifiable marks the submission **needs review**. A configured reviewer that fails (timeout, empty answer) is shown as such and also flags the score as not cross-checked — the panel never degrades silently. Keyword-only fallback scoring is always flagged.
- **Human override.** On a submission the admin can set their own score per criterion with a note. It becomes the final score (what the student, the card and the exports show) and is kept alongside the AI's.
- **Measured accuracy.** The Scores page reports the average AI-vs-human gap, % within 10 points, bias (is the AI more generous than people?), the gap per reviewer model, and the share of each model's quotes that verified. The honest answer to "can we trust it?" is a number.

Local reasoning models (Qwen3, DeepSeek-R1…) can spend their whole token budget thinking and answer nothing, so local calls ask for brief reasoning (`reasoning_effort: low`, retried without it if the server rejects the field), have a 4-minute limit and a 3.5k-token budget.

## AI (optional)

Only two features use a model: the project evaluator and the campus-kit messages. Everything else is plain code and SQL.
Configure it at **`/admin/ai`**:

- **Run a local model** — Ollama, LM Studio or any OpenAI-compatible server on the same machine as the app. Pick a preset
  (Qwen3 4B/8B, Qwen2.5 7B, Llama 3.1/3.2, Gemma 3, Mistral, Phi-4 mini), type any model name, or press *Detect installed models*.
  Local models only work when the app runs on the same machine as the model server — not on Vercel.
- **Use an API key** — Gemini, Groq and OpenRouter (all have free tiers), OpenAI, Anthropic, or any OpenAI-compatible endpoint.
- **Off** — the evaluator falls back to a basic automated check and the kit to templates.

**How the API key is protected:** it is encrypted (AES-256-GCM, per-value salt and IV) before it touches the database, using
`SETTINGS_SECRET` (or `ADMIN_PASSWORD`). It is never sent to the browser: the admin page only learns *that* a key exists.
To read it back you re-enter the admin password (rate-limited to 5 tries per 10 minutes); it is then shown for 30 seconds,
hidden early if you switch tabs, and cleared from the page. Error messages have the key scrubbed. If the server secret
changes, the stored key can't be decrypted and you are simply asked to enter it again.

## Security

- **Production env:** set a long random `ADMIN_PASSWORD`, a separate `SETTINGS_SECRET`, and `NEXT_PUBLIC_SITE_URL` (so referral links never depend on the request's Host header).
- **Admin sessions** are an HMAC of the issue time keyed by the password: they expire after 12 hours server-side, die when the password changes, and the cookie is `httpOnly`, `secure`, `SameSite=Strict`. Password checks are constant-time and don't leak length.
- **Rate limits** live in Postgres (`rate_limits`, keyed by a hash of the IP), so they hold across serverless instances: admin login 5 per 15 min per IP and 40 per hour overall; key reveal 5 per 10 min; registration 30 per 10 min per IP (room for campus/carrier NAT); "find my challenge" 10 per 15 min; evaluator 5 per hour per IP and 400 per day overall (protects the free model quota); AI campus kit 10 per hour per IP and 300 per day overall, then templates.
- **No account enumeration:** registering with someone else's email or number (but not both) gets a neutral message, never their page.
- **SSRF:** student links are fetched with the private-address check inside the socket's own DNS lookup (no DNS rebinding), on every redirect, ports 80/443 only, no credentials in URLs, response size capped after decompression.
- **Uploads** are checked by extension and magic bytes, served only to the admin (or the assigned student) with a server-chosen type and `nosniff`. Zips are read without trusting declared sizes beyond the cap (tested against a 300 MB zip bomb).
- **Headers:** `frame-ancestors 'none'` / `X-Frame-Options: DENY`, `nosniff`, HSTS, a strict referrer policy, permissions policy and COOP on every response.
- **Data:** row-level security on every table with no policies; contact details never reach the browser; CSV exports neutralise spreadsheet formulas; markdown never renders raw HTML.

## Design notes

- **Referral counts only when the friend registers**, and only if the code belongs to a real registrant. Self-referral is ignored.
- **Duplicate email/WhatsApp** sends the person to their existing link instead of erroring, including when two identical submissions race.
- **Contact details never reach the browser.** Public pages show first name + initial.
- **Evaluator safety:** submitted URLs are fetched server-side, so private/loopback addresses are blocked and every redirect is re-checked. Page and README text is treated as untrusted data in the prompt, scores are clamped to 0–20 server-side, and "works live" is measured, not judged by the model.
- Channel attribution for the dashboard comes from the `src` tag (`amb-…`, `instagram`, `tpo-email`, …) plus referrals.
- The college list is a starting point, not an official registry; entries are best-effort and the approval flow exists precisely because it will be incomplete.
