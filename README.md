# Season One Healthcare — Web App

A React + Vite + Tailwind + Supabase application that matches Physician
Assistants with opportunities, with a PA dashboard and an admin back office.
Lives at `app.seasononehealthcare.com`; logged-out visitors are sent to the
marketing site (`seasononehealthcare.com`).

## Tech stack

- **React 18 + Vite** — SPA frontend
- **Tailwind CSS** — styling (design tokens match the marketing site)
- **Supabase** — Postgres + Auth + Row Level Security
- **React Router v6** — routing with protected/admin route guards
- **react-hot-toast** — notifications
- **Google Places** — US city autocomplete on location fields
- **Web3Forms** — the "My Team" contact form

## Project layout

```
app/
├── src/
│   ├── components/      # UI primitives, layout, route guards
│   ├── context/         # AuthContext (session + profile)
│   ├── hooks/           # useMatches
│   ├── lib/             # supabase client, constants, places, formatters
│   └── pages/           # login, register, dashboard/*, admin/*
├── supabase/
│   ├── migrations/0001_initial_schema.sql   # tables, RLS, triggers
│   └── seed.sql                             # optional sample data
├── .env.example
└── vercel.json          # SPA rewrites for Vercel
```

## 1. Install

```bash
cd app
npm install
```

> Requires Node 18+ (built/tested on Node 26). If you don't have Node,
> `brew install node`.

## 2. Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

| Variable                 | Where to get it                                   |
| ------------------------ | ------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase → Settings → API → Project URL           |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key       |
| `VITE_GOOGLE_MAPS_KEY`   | Google Cloud → JS Maps API key (Places enabled)   |
| `VITE_WEB3FORMS_KEY`     | Pre-filled (`support@seasononehealthcare.com`)    |

The app shows a friendly "Supabase isn't configured" screen until the two
Supabase vars are set. Location fields gracefully fall back to plain text
inputs if the Google key is missing, so you can develop without it.

## 3. Set up the database

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/0001_initial_schema.sql`.
3. (Optional) Run `supabase/seed.sql` for sample opportunities/facilities.

This creates the `users`, `opportunities`, `matches`, and `facilities`
tables, all enums, Row Level Security policies, and triggers that:

- create a `public.users` row when someone signs up (copying their profile
  fields from signup metadata),
- **auto-create matches** for every PA whose specialty matches a newly posted
  opportunity (and vice-versa when a PA sets their specialty).

### Auth setting (important)

For the intended "register → straight to dashboard" flow, disable email
confirmation: **Authentication → Sign In / Providers → Email → turn off
"Confirm email."** If you leave it on, new users see a "check your email"
message and land on the dashboard after confirming + signing in (also fully
supported).

### Make yourself an admin

Admins are PAs with `role = 'admin'`. After registering once, run in the SQL
editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

Sign out/in and you'll see the **Admin** section in the sidebar.

## 4. Run locally

```bash
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## 5. Deploy to Vercel

1. Import the repo (set the **Root Directory** to `app/` if this lives in a
   monorepo).
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
   (`vercel.json` already adds the SPA rewrite so deep links work.)
3. Add the four `VITE_*` environment variables in the Vercel project settings.
4. Add the domain **`app.seasononehealthcare.com`** under the project's
   Domains, and create the matching `CNAME` in Cloudflare DNS
   (`app` → `cname.vercel-dns.com`). Keep the apex/`www` marketing site as-is.

## Routes

| Route                       | Access            | Purpose                              |
| --------------------------- | ----------------- | ------------------------------------ |
| `/`                         | public            | redirect (marketing or dashboard)    |
| `/login`, `/register`       | public            | auth (+ inline forgot-password)      |
| `/complete-profile`         | auth              | finish profile if incomplete         |
| `/dashboard`                | PA                | stats, comp chart, latest matches    |
| `/dashboard/opportunities`  | PA                | filterable matches + interest        |
| `/dashboard/contracts` …    | PA                | opportunities pre-filtered by type   |
| `/dashboard/profile`        | PA                | edit profile                         |
| `/dashboard/team`           | PA                | contact form (Web3Forms)             |
| `/admin`                    | admin             | overview metrics                     |
| `/admin/opportunities`      | admin             | post/edit/(de)activate roles         |
| `/admin/facilities`         | admin             | review submissions, update status    |

## Notes & next steps

- **Facilities are admin-only** per the RLS spec. To let the public marketing
  form insert leads directly, uncomment the `facilities_public_insert` policy
  in the migration (or post them via an Edge Function).
- `npm audit` flags the usual transitive Vite/esbuild dev-server advisories;
  they don't affect the production build. Don't run `audit fix --force` (it
  bumps majors).
- Design tokens live in `tailwind.config.js` and `src/index.css`
  (`bg-navy`, `text-blue`, `rounded-card` = 12px, `rounded-btn` = 9px).
