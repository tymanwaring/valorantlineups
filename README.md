# Valorant Lineups

A personal Valorant lineup tool: browse lineups by map and agent, with a
cinematic Attack/Defense selector, Sova charge/bounce indicators, a step-by-step
image carousel, and an admin area for adding/editing/deleting lineups and
managing map rotation.

The web app lives in [`web/`](web/) (Next.js App Router + TypeScript + Tailwind).

## Project layout

- `web/` — the Next.js app. This is the only folder Vercel deploys (set the
  Vercel **Root Directory** to `web`). The map background images the site uses
  live in `web/public/maps/` and are committed.
- `scripts/` — one-off Python helpers (not deployed):
  - `build_web_maps.py` — downloads + darkens the loading screens into
    `web/public/maps/` (the text-free images the site uses).
  - `build_lineups.py` — same, but bakes the map name on top (for Google Docs);
    output goes to `lineups/` at the repo root, which is gitignored/regenerable.

```bash
cd scripts
python -m pip install -r requirements.txt
python build_web_maps.py   # refresh the site's map images
python build_lineups.py    # regenerate the Google-Docs images
```

## Local development

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000.

With no environment variables set, the app runs in **local mode**: lineup data is
stored in `web/data/*.json` and images are saved to `web/public/uploads/`. Admin
pages are open (no password) in this mode.

## Production (Vercel + Neon + Vercel Blob)

In production the app automatically switches storage based on env vars:

| Variable                | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `DATABASE_URL`          | Neon Postgres connection string (lineups, rotation) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token (uploaded images)           |
| `ADMIN_PASSWORD`        | Enables the admin login gate at `/admin/login`      |

The database schema and seed data are created automatically on first request.

See [`web/.env.example`](web/.env.example) for the full list, and the deploy
steps below.

## Deploy steps

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Set **Root Directory** to `web`.
4. Add a **Neon** Postgres store (Storage tab) → it sets `DATABASE_URL`.
5. Add a **Vercel Blob** store (Storage tab) → it sets `BLOB_READ_WRITE_TOKEN`.
6. Add an `ADMIN_PASSWORD` environment variable.
7. Deploy.
