# NTOU Map — Report Form Backend Setup

## Status: Paused — resuming tomorrow

---

## What's already done ✅

- [x] Report window UI (draggable, multi-step form)
- [x] Topic selection: 聯絡我們 / 回報錯誤or建議 / 我想要改造建築物  
- [x] `eye_window.js` wired up to POST to Supabase REST API
- [x] MongoDB Atlas: Network Access set to `0.0.0.0/0` (all IPs allowed)
- [x] MongoDB Atlas app `ntou-map-reports` created (but MongoDB Data API is **shut down** — not usable)
- [x] Switched plan from MongoDB → **Supabase** (free, active REST API)

---

## What to do tomorrow 🔜

### Step 1 — Create Supabase account & project
- [ ] Go to **[supabase.com](https://supabase.com)** → sign in (GitHub login works)
- [ ] Click **"New Project"**
  - Name: `ntou-map`
  - Region: **Southeast Asia (Singapore)**
  - Password: anything
- [ ] Wait ~2 minutes for the project to spin up

### Step 2 — Create the `reports` table
- [ ] Left sidebar → **Table Editor** → **New Table**
- [ ] Table name: `reports`
- [ ] Add these columns (besides the default `id`):

  | Column name | Type |
  |---|---|
  | `type` | text |
  | `message` | text |
  | `time` | text |

- [ ] **Uncheck** "Enable Row Level Security (RLS)" for now
- [ ] Click **Save**

### Step 3 — Get your API keys
- [ ] Left sidebar → **Project Settings** (⚙️ gear icon) → **Data API**
- [ ] Copy **Project URL** → looks like `https://abcdefgh.supabase.co`
- [ ] Copy **anon public** key → long string starting with `eyJ...`

### Step 4 — Paste keys into the project
- [ ] Open `c:\Users\Wong\Desktop\ntou_map\ntou_map\eye_window.js`
- [ ] Edit lines 5–6 at the very top of the file:

```js
const SUPABASE_CONFIG = {
    url:     "https://YOUR_PROJECT_ID.supabase.co",  // ← paste Project URL
    anonKey: "YOUR_ANON_KEY",                        // ← paste anon key
    table:   "reports",
};
```

### Step 5 — Test it
- [ ] Open `http://localhost:3000` (run `npx serve . -p 3000` if not running)
- [ ] Click the report button → pick a topic → type a message → send
- [ ] Go to Supabase → **Table Editor** → `reports` table
- [ ] Confirm the row appeared with correct `type`, `message`, and `time`

---

## File locations

| File | Purpose |
|---|---|
| `eye_window.js` (lines 1–13) | Supabase config — put your keys here |
| `eye_window.js` (line ~100+) | `submitReport()` — sends POST to Supabase |
| `wrangler.jsonc` | Cloudflare Worker config (serves static files) |
| `src/index.ts` | Worker code (static passthrough only) |

---

## Notes

- The MongoDB Atlas app (`ntou-map-reports`) you created is **useless** — MongoDB shut down their Data API. You can delete it.
- The MongoDB **Network Access** rule (`0.0.0.0/0`) is also useless now — you can delete it or leave it.
- Supabase anon key is **safe to put in public JS** — it only allows inserts into the `reports` table if RLS is configured, or with RLS off it's still okay for a simple contact form.
