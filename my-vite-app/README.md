# BottleCaller

## Cloudflare Pages

This app builds as a static Vite site and is ready to deploy on Cloudflare Pages.

Use these settings in the Cloudflare Pages project:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `my-vite-app` if deploying from the repo root, otherwise leave blank if this folder is the repo root in Pages

If Cloudflare runs `wrangler versions upload` from the repository root, keep the repo-root `wrangler.toml` checked in. It points Wrangler at `my-vite-app/dist` so static asset uploads still succeed even when the app itself lives in a subdirectory.

Set these environment variables in the Pages project before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GODOT_SHIFT_BASE` (required for Cloudflare production Godot floor)

### Godot floor assets (Cloudflare 25 MiB limit)

Cloudflare Workers/Pages reject any single static asset over **25 MiB**. The Godot export includes:

- `public/godot-shift/index.pck` (~253 MiB)
- `public/godot-shift/index.wasm` (~42 MiB)

Those files are kept out of the Workers upload via `.assetsignore` and a post-build strip step. Host them separately (Cloudflare R2 is the usual choice), then set:

```bash
VITE_GODOT_SHIFT_BASE=https://<your-public-r2-or-cdn-host>/godot-shift
```

Upload the full contents of `public/godot-shift/` to that location so these URLs resolve:

- `$VITE_GODOT_SHIFT_BASE/index.html`
- `$VITE_GODOT_SHIFT_BASE/index.js`
- `$VITE_GODOT_SHIFT_BASE/index.pck`
- `$VITE_GODOT_SHIFT_BASE/index.wasm`

Use the repository's authenticated multipart publisher for the large Godot export:

```bash
npm run godot:web:restore
npm run godot:r2:dry-run
npm run godot:r2:publish
```

See [`docs/godot-r2-publishing.md`](docs/godot-r2-publishing.md) for the complete
export, upload, verification, cleanup, and Windows routine.

Local `npm run dev` still serves `/godot-shift` from `public/` without the env var.

For local development:

```bash
cp .env.example .env
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

The app includes `public/_redirects` for SPA fallback routing, and `game/game.html` is emitted as a separate static entry during the Vite build.
