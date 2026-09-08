import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ctx = createContext({ globalThis: {} });
ctx.globalThis = ctx;
runInContext(readFileSync(join(here, 'helpers.js'), 'utf8'), ctx);

const {
  isCloudArtRef, safeOrderId, safeCloudFileName, pedidoJsonPath, pedidoArtPath, cloudArtSlots
} = ctx;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(isCloudArtRef('gs://tgm-garment-studio.firebasestorage.app/pedidos/abc/pedido.json'), 'gs path');
assert(isCloudArtRef('https://firebasestorage.googleapis.com/v0/b/tgm-garment-studio.firebasestorage.app/o/pedidos%2Fx%2Fart%2Fa-logo.png?alt=media&token=abc'), 'download url');
assert(!isCloudArtRef('data:image/png;base64,aaa'), 'ignore data urls');
assert(!isCloudArtRef('https://example.com/x.png'), 'ignore other hosts');
assert(safeCloudFileName('Logo Cliente #2.PNG') === 'Logo-Cliente-2.PNG', 'safe file name');
assert(pedidoJsonPath('order-123') === 'pedidos/order-123/pedido.json', 'pedido path');
assert(pedidoArtPath('order-123', 'art-1', 'marca.png') === 'pedidos/order-123/art/art-1-marca.png', 'art path');
try { safeOrderId('../x'); throw new Error('accepted bad id'); } catch (e) { if (e.message === 'accepted bad id') throw e; }

const slots = cloudArtSlots({
  artworks: [{ id: 'a1', image: 'data:image/png;base64,xx', fileName: 'logo.png', logo: { original: { data: 'data:image/png;base64,yy', name: 'raw.svg' } } }],
  photo: { final: { front: { image: 'data:image/png;base64,zz' } } },
  reference: { attachments: [{ id: 'r1', extension: 'png', data: 'data:image/png;base64,ww', name: 'ref.png' }] }
});
assert(slots.length === 4, 'collect artwork, original, final render, image attachment');
console.log('cloud helper tests passed');
