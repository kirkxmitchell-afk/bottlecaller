# BottleCaller

## Cloudflare Pages

This app builds as a static Vite site and is ready to deploy on Cloudflare Pages.

Use these settings in the Cloudflare Pages project:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `my-vite-app` if deploying from the repo root, otherwise leave blank if this folder is the repo root in Pages

Set these environment variables in the Pages project before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

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
