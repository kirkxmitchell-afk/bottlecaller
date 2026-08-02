# Bottlecaller Setup Checklist for Other Machine

## Quick Start
The other machine needs to follow these steps to get the app running.

### 1. Clone the complete repository

Install Git and Git LFS first. Then run:

```bash
git lfs install
git clone https://github.com/kirkxmitchell-afk/bottlecaller.git
cd bottlecaller
git lfs pull
```

Git LFS downloads the Godot artwork and the exported Web binaries. The generated
`bottlecaller_godot_floor/.godot/` import cache is intentionally excluded and is
rebuilt by Godot on the new machine.

### 2. Install Dependencies
```bash
cd my-vite-app
npm ci
```

### 3. Environment Setup
Create a `.env.local` file in `my-vite-app/` with these variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Ask the main developer for the actual Supabase credentials.**

### 4. Run Dev Server
```bash
npm run dev
```

Server should start at: `http://localhost:5173/`

### 5. Verify Build
```bash
npm run build
```

Check that `dist/` folder is created with compiled assets.

### 6. Open the editable Godot project

Install Godot 4.4.1 and import this project file:

```text
bottlecaller_godot_floor/project.godot
```

Allow Godot to finish its first import before running or exporting the project.
The first import can take time because the character and table artwork is stored
as source assets rather than as a copied `.godot` cache.

### 7. Godot and Cloudflare Publishing

Install Godot 4.4.1 when this machine will edit or export the shift game. Log this
machine into Cloudflare once from `my-vite-app/`:

```bash
npx wrangler login
```

After a Godot Web export, use the tracked cross-platform routine:

```bash
npm run godot:web:restore
npm run godot:r2:dry-run
npm run godot:r2:publish
```

The large `.pck` and `.wasm` files go to R2 through a temporary authenticated
multipart Worker. The publisher removes that Worker when it finishes. Full details
are in `my-vite-app/docs/godot-r2-publishing.md`.

---

## If Still Having Issues

Run the diagnostic script:
```bash
bash DIAGNOSTIC.sh
```

Then share the output with the main developer.

---

## Common Problems

| Problem | Solution |
|---------|----------|
| "npm: command not found" | Install Node.js from nodejs.org |
| "ENOENT: no such file or directory" in supabase.js | Set up `.env.local` with Supabase credentials |
| Blank page / assets not loading | Check browser console for 404s, may need different build |
| Port 5173 already in use | Run `npm run dev -- --port 3000` to use different port |

---

## Files to Check
- `package.json` — project dependencies and scripts
- `vite.config.js` — build configuration
- `.env.example` — required environment variables template
- `src/main.js` — entry point

---

## What to Share Back
1. Output of `bash DIAGNOSTIC.sh`
2. Browser console errors (F12 → Console tab)
3. Terminal output from `npm run dev`
4. Any error messages from `npm run build`
