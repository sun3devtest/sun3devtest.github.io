# Drive Media Gallery (Frontend-only)

Static photo/video gallery served from a public Google Drive folder. A build-time Node script generates `public/media.json` with signed view/download URLs; a GitHub Action refreshes it daily. Ready for GitHub Pages.

## Structure
- `index.html`, `styles.css`, `app.js` — frontend (no build step)
- `public/media.json` — generated media list
- `scripts/fetch-media.js` — Drive API fetcher
- `.github/workflows/update-media.yml` — daily refresher workflow

## Prerequisites
- Google Cloud project with Drive API enabled
- A public (or link-share) Drive folder containing images/videos
- Environment variables: `FOLDER_ID` (Drive folder ID), `API_KEY` (Drive API key)
- Node 18+

## Usage
1) Install (no deps, but sets up npm scripts):
```bash
npm install
```
2) Generate `public/media.json` locally:
```bash
FOLDER_ID=your_folder_id API_KEY=your_api_key npm run fetch-media
```
3) Serve locally (any static server). Example:
```bash
npx serve .
```
Open `http://localhost:3000` (or port shown). The frontend reads `public/media.json`, renders a responsive grid, supports images/videos, and offers a Download button per item (uses Drive `url_dl`).

## GitHub Action (media refresh)
1) Add repository secrets `FOLDER_ID` and `API_KEY`.
2) The workflow `.github/workflows/update-media.yml` runs daily at 03:00 UTC (and on manual trigger), runs `npm run fetch-media`, and commits `public/media.json` if it changed.

## Deploy to GitHub Pages
- Easiest: Settings → Pages → Deploy from branch → `main` / `/ (root)` (since `index.html` is in the repo root). Media is served from `public/media.json`.
- After initial run of the fetch script, push changes; Pages will serve `index.html`.

## Notes
- The Drive folder must allow file access via the API key (public/link-sharing recommended for Pages).
- Thumbnails use Drive `thumbnailLink` when provided, else fallback to `https://drive.google.com/thumbnail?id=FILE_ID&sz=w800`.
- View/download URLs use `uc?export=view|download&id=FILE_ID`.
