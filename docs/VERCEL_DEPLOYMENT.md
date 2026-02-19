# Vercel Deployment Guide (MetroFlow)

This project is a Next.js App Router app and deploys natively on Vercel.

## 1) Prerequisites

- GitHub/GitLab/Bitbucket repo with this project
- Vercel account: https://vercel.com
- Node 18+ locally

## 2) Push latest code

```bash
git add -A
git commit -m "prepare for vercel"
git push origin <your-branch>
```

## 3) Deploy with Vercel Dashboard (recommended)

1. Open Vercel dashboard.
2. Click **Add New → Project**.
3. Import your repository.
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
5. Click **Deploy**.

## 4) Deploy with Vercel CLI (alternative)

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## 5) Environment Variables

This app currently does not require mandatory server secrets for basic UI/routing.

If you later add APIs/keys:

1. Go to Vercel Project → **Settings → Environment Variables**
2. Add keys for `Production`, `Preview`, and `Development`
3. Redeploy after updates

## 6) GPS/Geolocation Notes

- `navigator.geolocation` requires secure origin in browsers.
- Vercel production URLs are HTTPS, so GPS works in production.
- Verify browser location permission is allowed.

## 7) Verify post-deploy

After deployment, check:

- Home route planner widget opens route option modal
- `/route` page planner behavior matches home widget
- Route result bubble map and line-color changes
- GPS button in header and GPS player tracking in route result
- Bottom tab navigation on mobile viewport

## 8) Custom Domain (optional)

1. Vercel Project → **Settings → Domains**
2. Add domain and follow DNS records shown by Vercel
3. Wait for SSL issuance and propagation

## 9) Troubleshooting

### Build fails with `next: not found`
Dependencies were not installed. Ensure `package.json` is committed and install step runs in Vercel.

### Geolocation not updating
- Ensure site is HTTPS
- Grant location permission
- Test on physical device for best GPS accuracy

### D3 map not rendering
- Check browser console for blocked CDN script
- Confirm internet access to `https://cdn.jsdelivr.net/npm/d3@7`
