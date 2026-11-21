# TreeQR

TreeQR makes a shareable, mobile-friendly tree guide and QR code from a tree name. Tree facts are retrieved from Wikipedia and Wikidata; tree photos are searched from Wikimedia Commons. Fields not present in the retrieved sources are identified as undocumented instead of being guessed.

## Run locally

```sh
npm install
npm run dev
```

Without Supabase credentials, generated tree records are saved in this browser's local storage. This is convenient for trying the app, but links are not available on other devices.

## Enable shared, persistent tree pages

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set the project URL and anon key.
4. Restart the Vite dev server or redeploy the app.
5. Set VITE_PUBLIC_APP_URL to your deployed app URL (example: https://treeqr.yourdomain.com).


The public tree page reads its record from Supabase without a login.
QR permanence note: QR codes are permanent only when they point to a stable deployed domain. After setting VITE_PUBLIC_APP_URL, all generated QR codes (including existing saved trees) resolve to that fixed public domain and remain reusable later.
 The schema allows anonymous insert and update so visitors can publish a guide without accounts; Supabase row-size checks and unique stable tree IDs limit accidental duplication. For a public production deployment, configure appropriate project quotas and monitor anonymous writes.

## Build

```sh
npm run build
npm run lint
```

The app uses React, TypeScript, Tailwind CSS, Supabase, Wikipedia/Wikidata/Wikimedia Commons APIs, and the `qrcode` package. Tree URLs are deterministic from the canonical article title, so regenerating or refreshing the same tree updates the stored details without changing its QR destination.


## Permanent deployment (recommended)

Local `npm run dev` links (for example `10.x.x.x`) only work while your laptop is running and usually only on the same Wi-Fi.
For always-on QR codes across different phones, deploy TreeQR to a public domain.

### Option A: Vercel (quick)

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Set environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PUBLIC_APP_URL` = your final domain (example: `https://treeqr.vercel.app`)
4. Deploy.

### Option B: Netlify

1. Push this project to GitHub.
2. Import repo in Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PUBLIC_APP_URL` = your final domain
6. Deploy.

After deployment, regenerate/share QR codes once so all new QR images point to your permanent public domain.
