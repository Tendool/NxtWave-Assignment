# Build60 — registration + referral engine

Campaign site for the free workshop **"Build Your First AI Project in 60 Minutes"**.
Goal: 500 registrations from final-year engineering students in 7 days on a ₹2,000 budget.

## What's in it

| Route | What it does |
|---|---|
| `/` | Landing page, live seat meter, registration form with searchable college picker. `?ref=CODE` credits a referrer, `?src=TAG` tags a channel. |
| `/thanks/[code]` | Confirmation, personal referral link, one-tap WhatsApp share, own rank. |
| `/leaderboard` | College and top-referrer standings (names shown as "Ananya R."). |
| `/kit` | Ambassador kit: tracking link + 3 forwardable WhatsApp messages (AI-written if a key is set). |
| `/evaluate` | After the workshop: submit live link + repo, get a rubric score and 3 fixes. |
| `/gallery` | Submitted projects ranked by score. |
| `/admin` | Password-protected dashboard: growth vs. 500, plan-vs-actual per channel, states, CSV export, review of student-added colleges. |

Light and dark themes follow the system setting; the header toggle overrides it and is remembered.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

No database setup needed. With `DATABASE_URL` unset, development uses **PGlite** — a real embedded
Postgres stored in `.data/pg` — and runs the same migrations as production. Open `/admin`
(password `admin` in dev) and press **Load demo data** to fill it with sample registrations.

## Database

One Postgres schema (`src/db/schema.ts`, Drizzle ORM), three tables:

- **`colleges`** — reference table seeded with ~560 Indian engineering colleges (`src/db/colleges-data.ts`): IITs, NITs, IIITs, central/state universities and major private colleges, with city, state/region and type. A college a student types that isn't listed is stored as `verified = false` and shows up on the admin dashboard to approve.
- **`registrations`** — FK to `colleges`, self-referencing FK for referrals (`referred_by_id`), enums for branch/year.
- **`evaluations`** — project submissions with a JSONB score breakdown, optionally linked to a registration.

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

## Design notes

- **Referral counts only when the friend registers**, and only if the code belongs to a real registrant. Self-referral is ignored.
- **Duplicate email/WhatsApp** sends the person to their existing link instead of erroring, including when two identical submissions race.
- **Contact details never reach the browser.** Public pages show first name + initial.
- **Evaluator safety:** submitted URLs are fetched server-side, so private/loopback addresses are blocked and every redirect is re-checked. Page and README text is treated as untrusted data in the prompt, scores are clamped to 0–20 server-side, and "works live" is measured, not judged by the model.
- Channel attribution for the dashboard comes from the `src` tag (`amb-…`, `instagram`, `tpo-email`, …) plus referrals.
- The college list is a starting point, not an official registry; entries are best-effort and the approval flow exists precisely because it will be incomplete.
