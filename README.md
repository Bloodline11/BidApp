# Sterling Park Bid Calculator

A fast, single-screen bid calculator for BCA auctions, with DVSA MOT history
lookup and bid history tracking. Runs entirely in your browser — no server,
no account, no build step. Installs to your Android home screen and works
offline (except the MOT lookup, which needs signal).

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The whole app — calculator, MOT lookup, history, settings |
| `manifest.json` | Lets Chrome install it to your home screen |
| `sw.js` | Service worker — caches the app so it opens offline |
| `icon-192.png`, `icon-512.png` | App icons |
| `cloudflare-worker.js` | Optional proxy code for the DVSA MOT API (see Part 3) |

All your data — settings, fee bands, bid history, cached MOT lookups, and
your DVSA credentials — is stored **only in your phone's browser**
(`localStorage`). Nothing is sent anywhere except directly from your phone
to your own proxy and to DVSA/Microsoft when you do an MOT lookup. Clearing
your browser data or uninstalling the app will delete it — use **Export**
in the History tab regularly if you want a backup.

---

## Part 1 — Deploy it (pick one)

You need somewhere to host these 5 files so your phone can reach them over
HTTPS. Two options, easiest first.

### Option A: Netlify Drop (easiest, no account strictly required)

1. On your computer, go to **https://app.netlify.com/drop** in a browser.
2. Select all 5 files in this folder (`index.html`, `manifest.json`, `sw.js`,
   `icon-192.png`, `icon-512.png`) and drag them onto the page. (Don't drag
   the folder itself — drag the files, or zip them and drop the zip.)
3. Netlify uploads them and gives you a live URL like
   `https://random-name-1234.netlify.app`. That's it — it's live.
4. Optional: click "Claim this site" and sign up free if you want to keep
   the URL stable and be able to update it later, rather than it being a
   one-off anonymous deploy.
5. To update later: go back to the same Netlify site (once claimed) and
   drag the updated files onto the same deploy page.

### Option B: GitHub Pages (if you'd rather use GitHub)

1. Go to **github.com**, sign up if you don't have an account, and click
   **New repository**. Name it e.g. `bid-calculator`, set it to **Public**,
   click **Create repository**.
2. On the new repo page, click **uploading an existing file**.
3. Drag in `index.html`, `manifest.json`, `sw.js`, `icon-192.png`,
   `icon-512.png`. Scroll down, click **Commit changes**.
4. Go to the repo's **Settings** tab → **Pages** (left sidebar).
5. Under "Build and deployment", set **Source** to **Deploy from a branch**,
   branch **main**, folder **/ (root)**. Click **Save**.
6. Wait about a minute, then refresh — GitHub shows you the live URL, something
   like `https://yourusername.github.io/bid-calculator/`.
7. To update later: open the file in GitHub, click the pencil (edit) icon,
   paste the new contents, commit.

Either way, you now have an HTTPS URL. Open it on your Android phone in
**Chrome** to continue.

---

## Part 2 — Add it to your Android home screen

1. Open your deployed URL in **Chrome** on your Android phone.
2. Tap the **⋮** menu (top right).
3. Tap **Add to Home screen** (or **Install app** if Chrome offers it directly).
4. Confirm the name (Bid Calc) and tap **Add** / **Install**.
5. You'll now have an icon on your home screen that opens full-screen, like
   a native app. The calculator works offline from here on — you don't need
   signal to use it once it's loaded the first time.

---

## Part 3 — Add your DVSA MOT API key

The DVSA MOT History API is free, but it **blocks direct requests from a
browser** (there's no CORS support), so the app can't call it directly from
your phone. You need something in the middle to relay the request. Two
options — the app defaults to the first.

### Get your credentials first

Register for API access at the DVSA/Trade portal
(**https://history.mot.api.gov.uk/**, via the "Trade API" / developer
registration route) and register an application in Microsoft Entra (Azure
AD) as instructed there. You'll end up with four values:

- **Tenant ID**
- **Client ID**
- **Client secret**
- **API key**

Keep these somewhere safe (a notes app) as well as pasting them into the
app — the client secret in particular is normally only shown once.

### Option 1 (recommended): Cloudflare Worker proxy — free, your credentials never leave your control

This runs a tiny bit of code on Cloudflare's free tier that sits between
your phone and DVSA, adding the permission headers browsers require. Your
credentials pass through it on every lookup but are never stored by it.

1. Go to **https://dash.cloudflare.com/sign-up** and create a free account
   (email + password, no card needed for the free tier).
2. Once logged in, in the left sidebar click **Workers & Pages**.
3. Click **Create** → **Workers** → **Create Worker**. Give it a name, e.g.
   `bid-calc-mot-proxy`, then click **Deploy** to create it with the default
   "Hello World" code.
4. Click **Edit code** (or **Configure** → **Edit code**).
5. Select all the existing code in the editor and delete it.
6. Open `cloudflare-worker.js` from this folder, copy its entire contents,
   and paste it into the Cloudflare editor.
7. Click **Deploy** (or **Save and deploy**).
8. Cloudflare gives you a URL like `https://bid-calc-mot-proxy.yourname.workers.dev`.
   That's your **proxy URL**.

### Option 2: public CORS proxy — testing only

For a quick test without setting up Cloudflare, you can point the app's
proxy URL at a public CORS-relay service instead. **Do not use this for
real API keys long-term** — your DVSA client secret and API key pass
through a third-party server you don't control, and it could log or leak
them. Use it briefly to confirm the app works, then switch to your own
Cloudflare Worker (Option 1) before relying on it. Search for a currently
maintained public CORS proxy that supports custom headers and POST bodies,
since free ones change and go offline often.

### Enter everything in the app

1. Open the app, go to the **Settings** tab.
2. Under **DVSA MOT History API**, enter:
   - **Proxy worker URL** — the `.workers.dev` URL from Cloudflare (no
     trailing slash needed)
   - **Tenant ID**, **Client ID**, **Client secret**, **API key** — from
     your DVSA/Azure registration
3. Tap **Save settings**.
4. Go to the **Bid** tab, type a registration in the box at the top, and
   tap **Check**. If everything's right, the vehicle details and MOT
   history load in a couple of seconds.

If a lookup fails, the app tells you plainly what went wrong (no signal, bad
registration, rejected credentials, rate limited) rather than leaving you
looking at a blank screen.

---

## Using it

- **Bid tab** — look up a reg (optional), enter hammer bid, sale price and
  prep cost. Everything else updates live: BCA fee, total cost, profit,
  margin, the colour-coded verdict, and — the number that matters — your
  **maximum bid** to hit target profit. If you're within £75 of a fee band
  boundary, a warning tells you exactly what it'll cost you to cross it.
- **Reverse toggle** (top right) — swap to enter your target profit instead
  of a hammer bid, and the app works out your ceiling for you.
- **Vehicle tab** — full MOT history, mileage progression (with clocking
  flags), advisories and failures for whatever reg you last looked up.
- **History tab** — every calculation you save, searchable by reg. Tap one
  to reload it. Mark bids Won / Lost / Skipped. Export/import as JSON for
  backup.
- **Settings tab** — target profit, default prep cost, the fee bands
  (edit these as BCA changes their fees), the fee-cliff warning window, and
  your DVSA credentials.

The calculator itself works immediately with sensible defaults, before you
add any API credentials — the MOT lookup is the only part that needs them.
