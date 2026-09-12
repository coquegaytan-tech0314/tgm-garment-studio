/* Build-time snapshot of pedidos/{id}/pedido.json so Abrir works when the
   browser cannot read Storage media (alt=media has no CORS). Live list/getBytes
   stays the preferred path once the bucket allows it. */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const BUCKET = 'tgm-garment-studio.firebasestorage.app';
const API = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/';
const here = dirname(fileURLToPath(import.meta.url));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw Error('HTTP ' + res.status + ' ' + url);
  return res.json();
}

async function getBytes(path) {
  const url = API + encodeURIComponent(path) + '?alt=media';
  const res = await fetch(url);
  if (!res.ok) throw Error('HTTP ' + res.status + ' ' + path);
  return new Uint8Array(await res.arrayBuffer());
}

function isRemote(value) {
  return typeof value === 'string' && (value.startsWith('https://') || value.startsWith('gs://'));
}

function pathFromRef(value) {
  if (value.startsWith('gs://')) return value.replace(/^gs:\/\/[^/]+\//, '');
  const encoded = value.match(/\/o\/([^?]+)/);
  if (encoded) return decodeURIComponent(encoded[1]);
  return '';
}

async function toPngDataUrl(bytes) {
  const img = await loadImage(Buffer.from(bytes));
  const scale = Math.min(1, 720 / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = createCanvas(w, h);
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

async function hydrate(order) {
  for (const art of order.artworks || []) {
    if (!isRemote(art.image)) continue;
    const path = pathFromRef(art.image);
    if (!path) continue;
    try {
      art.image = await toPngDataUrl(await getBytes(path));
    } catch (error) {
      console.warn('snapshot art skip', path, error.message);
    }
  }
  return order;
}

const list = await getJson(API + '?prefix=pedidos%2F&delimiter=%2F&maxResults=100');
const ids = (list.prefixes || []).map(p => p.replace(/\/+$/, '').split('/').pop()).filter(Boolean);
const orders = [];
for (const id of ids) {
  try {
    const raw = JSON.parse(new TextDecoder().decode(await getBytes('pedidos/' + id + '/pedido.json')));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    orders.push(await hydrate(raw));
    console.log('snapshot', raw.number || id, raw.client || '', raw.garment || '');
  } catch (error) {
    console.warn('snapshot skip', id, error.message);
  }
}
orders.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
const dest = join(here, 'snapshot.json');
await writeFile(dest, JSON.stringify(orders));
console.log('wrote', dest, orders.length, 'pedidos', Buffer.byteLength(JSON.stringify(orders)), 'bytes');
