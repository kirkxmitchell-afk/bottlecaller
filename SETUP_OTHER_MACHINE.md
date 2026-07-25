# Bottlecaller Setup Checklist for Other Machine

## Quick Start
The other machine needs to follow these steps to get the app running.

### 1. Install Dependencies
```bash
cd my-vite-app
npm install
```

### 2. Environment Setup
Create a `.env.local` file in `my-vite-app/` with these variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Ask the main developer for the actual Supabase credentials.**

### 3. Run Dev Server
```bash
npm run dev
```

Server should start at: `http://localhost:5173/`

### 4. Verify Build
```bash
npm run build
```

Check that `dist/` folder is created with compiled assets.

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
