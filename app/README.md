# Build60 — registration + referral engine

Campaign site for the free workshop **"Build Your First AI Project in 60 Minutes"**.
Goal: 500 registrations from final-year engineering students in 7 days on a ₹2,000 budget.

## What's in it

| Route | What it does |
|---|---|
| `/` | Landing page, live seat meter, registration form. `?ref=CODE` credits a referrer, `?src=TAG` tags a channel. |
| `/thanks/[code]` | Confirmation, personal referral link, one-tap WhatsApp share, own rank. |
| `/leaderboard` | College and top-referrer standings (names shown as "Ananya R."). |
| `/kit` | Ambassador kit: tracking link + 3 forwardable WhatsApp messages (AI-written if a key is set). |
| `/evaluate` | After the workshop: submit live link + repo, get a rubric score and 3 fixes. |
| `/gallery` | Submitted projects ranked by score. |
| `/admin` | Password-protected dashboard: growth vs. 500, plan-vs-actual per channel, CSV export. |

## Run locally

```bash
npm install
node scripts/seed.mjs 64   # optional: local demo data (git-ignored)
npm run dev                # http://localhost:3000, admin password "admin" in dev
```

With no env vars set it stores data in `.data/*.json`.

## Deploy (all free tiers)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Import the repo in Vercel, set **Root Directory** to `app`.
3. Add env vars from `.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`; optionally `ANTHROPIC_API_KEY`).

## Design notes

- **Referral counts only when the friend registers**, and only if the code belongs to a real registrant. Self-referral is ignored.
- **Duplicate email/WhatsApp** sends the person to their existing link instead of erroring.
- **Contact details never reach the browser.** The database is only touched server-side with the service key; public pages show first name + initial.
- **Evaluator safety:** submitted URLs are fetched server-side, so private/loopback addresses are blocked and every redirect is re-checked. Page and README text is treated as untrusted data in the prompt, scores are clamped to 0–20 server-side, and "works live" is measured, not judged by the model.
- Channel attribution for the dashboard comes from the `src` tag (`amb-…`, `instagram`, `tpo-email`, …) plus referrals.
