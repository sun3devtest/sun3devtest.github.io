#!/usr/bin/env node
/**
 * Build-time fetcher for Google Drive folder media.
 * Env: FOLDER_ID, API_KEY
 * Output: public/media.json
 */
const fs = require('fs');
const path = require('path');

const FOLDER_ID = getEnv('FOLDER_ID');
const API_KEY = getEnv('API_KEY');

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} must be set in the environment.`);
    process.exit(1);
  }
  return value;
}

const DRIVE_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const OUTPUT = path.join(__dirname, '..', 'public', 'media.json');

async function fetchPage(pageToken) {
  const url = new URL(DRIVE_ENDPOINT);
  url.searchParams.set('q', `'${FOLDER_ID}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`);
  url.searchParams.set('fields', 'files(id,name,mimeType,thumbnailLink),nextPageToken');
  url.searchParams.set('pageSize', '1000');
  url.searchParams.set('key', API_KEY);
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res.json();
}

function mapFile(file) {
  const thumb =
    file.thumbnailLink ||
    `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`;
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    thumb,
    url_view: `https://drive.google.com/uc?export=view&id=${file.id}`,
    url_dl: `https://drive.google.com/uc?export=download&id=${file.id}`,
  };
}

async function fetchAll() {
  let pageToken;
  const items = [];
  do {
    const data = await fetchPage(pageToken);
    (data.files || []).forEach((f) => items.push(mapFile(f)));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

(async () => {
  const media = await fetchAll();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(media, null, 2));
  console.log(`Wrote ${media.length} items to ${OUTPUT}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
