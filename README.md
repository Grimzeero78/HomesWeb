# ChukaHomes — Student Housing Finder for Chuka, Kenya

**Cloudflare-native full-stack website.** No build step, no servers to manage —
you push this folder to GitHub, connect Cloudflare Pages, and you're live.

| Layer | Tech |
|---|---|
| Frontend | Static PWA (HTML/CSS/JS, mobile-first + desktop layout) |
| Backend | Cloudflare Pages Functions (`functions/api/[[route]].js`) |
| Database | Cloudflare D1 (serverless SQLite) — **tables are created automatically** on first request |
| Chat | Real-time via 2.5-second polling (works on Cloudflare's free plan) |
| Photos | Compressed in the browser, stored in D1 (no R2/billing needed) |
| Maps | Real Google Maps (add a free API key in Admin → Settings). Without a key: Google embeds + deep links |

## Features
- Username + password accounts with **password confirm & password hint** (no OTP, no email) — "Forgot password?" shows your hint
- Roles: Student / Landlord / Admin · **first account created via `/#/setup` becomes the Admin**
- WhatsApp number collected at sign-up → Call / WhatsApp buttons on every listing
- Full listing wizard (8 steps): utilities, room, security & rules, walking times, Google-mapped location
- Search + filters + sort · **real Google Map with price pins** · favourites · view counters
- Live chat between students and landlords (unread badges)
- Landlord verification: admin opens the uploaded ID / ownership photos full-size, then approves
- **Boosts = manual M-Pesa payment to 0143374333 (Isaac Bridget)** → landlord submits code → admin confirms → 7 days at the top
- Reports queue, listing removal, user suspension · watermark on photos · "never pay before viewing" notices
- Free plan: 2 listings · Verified landlords: 5 listings

---

# 🚀 Deploy: GitHub + Cloudflare (step by step)

**Time: ~15 minutes. Cost: free.**

### What you need
1. A **GitHub** account — sign up at https://github.com (free)
2. A **Cloudflare** account — sign up at https://dash.cloudflare.com/sign-up (free, no card needed)

---

### STEP 1 — Download & unzip the project
Download `chukahomes-cloudflare.zip`, unzip it. You get a folder `chukahomes` containing:

```
chukahomes/
├── public/          ← the website (design + app)
├── functions/       ← the backend API (Cloudflare runs this automatically)
├── schema.sql       ← optional: paste in dashboard (tables also auto-create)
├── wrangler.toml    ← config (leave as is)
├── package.json     ← only needed for local development
└── README.md
```

### STEP 2 — Create the GitHub repo and upload the files
**Easiest way (browser, no commands):**
1. Go to https://github.com/new
2. Repository name: `chukahomes` · visibility **Private** (recommended) · click **Create repository**
3. On the new repo page click **"uploading an existing file"** (in the "Quick setup" section)
4. Open your unzipped `chukahomes` folder, select **everything inside it** (all files and the `public` and `functions` folders), and **drag them onto the GitHub page**
5. Wait for the upload, then click **Commit changes**

> ⚠️ Upload the files *inside* the folder — not the folder itself. GitHub should show `public`, `functions`, `README.md` etc. at the top level.

**Alternative (git commands):**
```bash
cd chukahomes
git init && git add -A && git commit -m "ChukaHomes"
git remote add origin https://github.com/<your-username>/chukahomes.git
git branch -M main && git push -u origin main
```

### STEP 3 — Connect Cloudflare Pages to your repo
1. Log in to https://dash.cloudflare.com
2. Left menu → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**
3. Click **GitHub**, authorise Cloudflare, then pick the `chukahomes` repo → **Begin setup**
4. Build settings — leave everything default/blank:
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: **`public`**
5. Click **Save and Deploy** → after ~30 seconds your site is live at
   `https://chukahomes.pages.dev` (or a similar name)

The site works already, but it has no database yet — the next step fixes that.

### STEP 4 — Create the D1 database and connect it
1. Cloudflare dashboard → **Workers & Pages** (left menu) → **D1** → **Create database**
2. Name: `chukahomes-db` → location: **Auto** → Create
3. Go back to **Workers & Pages** → click your **chukahomes** Pages project
4. **Settings** → **Bindings** → **Add** → choose **D1 database**
   - Variable name: `DB`  ← must be exactly `DB` (capital letters)
   - D1 database: select `chukahomes-db`
   - Save
5. Deployments tab → **Retry deployment** (bindings only apply after a redeploy)

That's it — **you do NOT need to run any SQL.** The API creates all tables automatically
on the first request (you can also paste `schema.sql` in the D1 Console if you prefer).

### STEP 5 — Create your Admin account (do this immediately!)
The page `/#/setup` only works while no admin exists — the first account created there
becomes the platform Admin, then it locks itself forever.

1. Open `https://your-site.pages.dev/#/setup`
2. Fill in your name, WhatsApp number, username, password (+ confirm + hint) → **Create admin**
3. You're signed in — you'll see the **Admin** panel in the menu

> ⚠️ Anyone who opens `/#/setup` before you could claim the admin. Do this step
> within minutes of deploying. (Fallback if someone else takes it: register a normal
> account, then in Cloudflare D1 Console run
> `UPDATE users SET role='ADMIN' WHERE username='their-username';`)

### STEP 6 — Turn on the real Google Map (5 minutes, free)
1. Go to https://console.cloud.google.com → sign in with your Google account
2. Top bar → **Create project** (name: `chukahomes`) → Select it
3. **APIs & Services → Library** → search **"Maps JavaScript API"** → **Enable**
4. **APIs & Services → Credentials** → **+ Create credentials → API key** → copy it
5. (Recommended) Click the key → **Application restrictions → HTTP referrers** → add
   `https://your-site.pages.dev/*` and your future domain
6. Back on ChukaHomes: **Admin → Settings** → paste the key → **Save**
   → the Map tab is now a real Google Map with price pins, and the listing wizard
   gets a click-to-pin map picker.

Google's free monthly credit (~$200) covers far more traffic than this site will use.
Without a key, everything still works — listings show a Google map embed and
"Open in Google Maps / Directions" buttons.

### STEP 7 — Test it like a user
- Register a **Landlord** account → Profile → upload ID + ownership photo → submit for verification
- Admin → **Verifications** → tap the photos to open them full-size → **Approve**
- Landlord → **Post a listing** → complete the 8 steps → publish
- Register a **Student** account (use a second browser/incognito) → search → open listing → **Message in app** → send messages → watch them appear
- Landlord → **Boost** → follow the M-Pesa instructions for **0143374333 (Isaac Bridget)** → submit the code
- Admin → **Boosts** → confirm → listing jumps to the top with a BOOSTED badge

---

## Daily use

| Task | How |
|---|---|
| Update the website | Edit files → upload to GitHub (drag-drop new versions or `git push`) → Cloudflare redeploys automatically in ~30 s |
| Change the boost payment number | Admin → Settings |
| Add another admin | D1 Console: `UPDATE users SET role='ADMIN' WHERE username='name';` |
| Back up the database | D1 → your database → **Export** (downloads a .sql file) — do this weekly |
| Custom domain (optional) | Pages project → Custom domains → add `chukahomes.co.ke` etc. — free SSL included |

## Costs & limits (free tier)
- **Pages/Functions**: 100,000 requests/day — enough for a very busy site
- **D1**: 5 GB storage + 5 million reads/day. Photos live in D1 (~100 KB each after browser compression) → thousands of listings fit easily. Run a weekly export as backup.
- **Chat** updates every 2.5 s while a chat is open — smooth on free plan; can be upgraded to Durable Objects WebSockets later if traffic grows

## Troubleshooting

| Problem | Fix |
|---|---|
| `{"ok":false,"error":"Database not connected..."}` | STEP 4 missing or wrong: binding name must be exactly `DB`, then Retry deployment |
| Map shows "not configured" | Add the key in Admin → Settings (STEP 6). "Failed to load" → enable *Maps JavaScript API* and make sure billing is active in Google Cloud |
| `/#/setup` says setup is closed | An admin already exists (maybe you, maybe someone else) — use the SQL fallback in STEP 5 |
| Changes on GitHub don't appear | Deployments tab → check build log; make sure output dir is `public` |
| Photos not uploading | Each photo must be < ~1 MB after compression; use JPG/PNG/WebP |

## Local development (optional)
```bash
npm install
npm run dev   # → http://localhost:8788 (local D1, auto-created schema)
```
Requires Node 18+. The local database is empty and separate from production.
