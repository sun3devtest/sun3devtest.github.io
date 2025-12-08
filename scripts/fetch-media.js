#!/usr/bin/env node
/**
 * Build-time fetcher for Google Drive folder media.
 * Use env vars: API_KEY and optionally FOLDER_ID (single folder); otherwise folders.json drives multiple folders.
 * Output: public/media.json
 */
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

const API_KEY = getEnv('API_KEY');

const DRIVE_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_GET_ENDPOINT = 'https://www.googleapis.com/drive/v3/files/';
const OUTPUT_MEDIA = path.join(__dirname, '..', 'public', 'media.json');

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: set env var ${name}`);
    process.exit(1);
  }
  return value;
}

async function fetchPage(folderId, pageToken) {
  const url = new URL(DRIVE_ENDPOINT);
  // query: files in folder AND image or video
  const q = `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  url.searchParams.set('q', q);
  // include fields and also nextPageToken
  url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,thumbnailLink,createdTime)');
  url.searchParams.set('pageSize', '1000');
  url.searchParams.set('key', API_KEY);

  // IMPORTANT: if folder is in a Shared Drive, include these
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  url.searchParams.set('supportsAllDrives', 'true');

  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    // print helpful debug info
    console.error('Request URL:', url.toString());
    console.error('Response status:', res.status);
    console.error('Response body:', text);
    throw new Error(`Drive API error ${res.status}`);
  }
  return res.json();
}

function mapFile(file, folderId) {
  const thumb =
    upscaleThumb(file.thumbnailLink) ||
    `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;
  const isVideo = (file.mimeType || '').startsWith('video/');
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    createdTime: file.createdTime,
    folderId,
    thumb,
    url_view: isVideo
      ? `https://drive.google.com/file/d/${file.id}/preview?autoplay=1`
      : `https://drive.google.com/uc?export=view&id=${file.id}`,
    url_dl: `https://drive.google.com/uc?export=download&id=${file.id}`,
  };
}

function upscaleThumb(link) {
  if (!link) return null;
  let out = link.replace(/=s\d+(-[a-z])?(\?.*)?$/i, '=w1000');
  if (!/[?&]authuser=/.test(out)) {
    out += out.includes('?') ? '&authuser=1' : '?authuser=1';
  }
  if (!/\/view$/.test(out)) {
    out += '/view';
  }
  return out;
}

async function fetchAllForFolder(folderId) {
  let pageToken;
  const items = [];
  do {
    const data = await fetchPage(folderId, pageToken);
    (data.files || []).forEach((f) => items.push(mapFile(f, folderId)));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

async function fetchFolderMeta(folderId) {
  const url = new URL(`${DRIVE_GET_ENDPOINT}${folderId}`);
  url.searchParams.set('fields', 'id,name,createdTime');
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch folder meta (${folderId}): ${res.status} ${text}`);
  }
  return res.json();
}

function loadFoldersList() {
  if (process.env.FOLDER_ID) {
    return [{ id: process.env.FOLDER_ID }];
  }
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'public', 'folders.json'), 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data.filter((f) => f?.id) : [];
    if (list.length > 0) return list;
  } catch (_) {
    // fall through
  }
  console.error('ERROR: provide env FOLDER_ID or define public/folders.json with an array of {id,name}');
  process.exit(1);
}

(async () => {
  try {
    const folders = loadFoldersList();
    const folderMetas = await Promise.all(
      folders.map(async (f) => {
        if (f.name) return f;
        const meta = await fetchFolderMeta(f.id);
        return { id: meta.id, name: meta.name };
      }),
    );

    const media = [];
    for (const folder of folderMetas) {
      const items = await fetchAllForFolder(folder.id);
      media.push(...items);
    }
    media.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

    fs.mkdirSync(path.join(__dirname, '..', 'public'), { recursive: true });
    fs.writeFileSync(OUTPUT_MEDIA, JSON.stringify(media, null, 2));
    console.log(`Wrote ${media.length} items to ${OUTPUT_MEDIA}`);
    console.log(`Loaded ${folderMetas.length} folder(s) from configuration`);
  } catch (err) {
    console.error('Fatal:', err.message || err);
    process.exit(1);
  }
})();
