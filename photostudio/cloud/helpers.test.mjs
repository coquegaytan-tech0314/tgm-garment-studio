import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const ctx = createContext({ globalThis: {}, setTimeout, clearTimeout, Promise });
ctx.globalThis = ctx;
runInContext(readFileSync(join(here, 'helpers.js'), 'utf8'), ctx);

const {
  isCloudArtRef, safeOrderId, safeCloudFileName, pedidoJsonPath, pedidoArtPath, cloudArtMime, cloudArtSlots,
  CLOUD_LIST_PAGE_SIZE, withTimeout, cloudPedidoIdsFromPrefixes, collectPedidoPrefixes,
  summarizeCloudPedidoReads, cloudLibraryNotice, listCloudPedidoMetadata
} = ctx;

assert.equal(isCloudArtRef('gs://tgm-garment-studio.firebasestorage.app/pedidos/abc/pedido.json'), true, 'gs path');
assert.equal(isCloudArtRef('https://firebasestorage.googleapis.com/v0/b/tgm-garment-studio.firebasestorage.app/o/pedidos%2Fx%2Fart%2Fa-logo.png?alt=media&token=abc'), true, 'download url');
assert.equal(isCloudArtRef('data:image/png;base64,aaa'), false, 'ignore data urls');
assert.equal(isCloudArtRef('https://example.com/x.png'), false, 'ignore other hosts');
assert.equal(safeCloudFileName('Logo Cliente #2.PNG'), 'Logo-Cliente-2.PNG', 'safe file name');
assert.equal(pedidoJsonPath('order-123'), 'pedidos/order-123/pedido.json', 'pedido path');
assert.equal(pedidoArtPath('order-123', 'art-1', 'marca.png'), 'pedidos/order-123/art/art-1-marca.png', 'art path');
assert.equal(cloudArtMime('pedidos/x/art/a-logo.JPG'), 'image/jpeg');
assert.equal(cloudArtMime('https://example/o/pedidos%2Fx%2Fa.JPEG?alt=media'), 'image/jpeg');
assert.equal(cloudArtMime('pedidos/x/art/mark.SVG'), 'image/svg+xml');
assert.equal(cloudArtMime('pedidos/x/art/mark.png'), 'image/png');
try { safeOrderId('../x'); throw new Error('accepted bad id'); } catch (e) { if (e.message === 'accepted bad id') throw e; }

const slots = cloudArtSlots({
  artworks: [{ id: 'a1', image: 'data:image/png;base64,xx', fileName: 'logo.png', logo: { original: { data: 'data:image/png;base64,yy', name: 'raw.svg' } } }],
  photo: { final: { front: { image: 'data:image/png;base64,zz' } } },
  reference: { attachments: [{ id: 'r1', extension: 'png', data: 'data:image/png;base64,ww', name: 'ref.png' }] }
});
assert.equal(slots.length, 4, 'collect artwork, original, final render, image attachment');

function host(value){return JSON.parse(JSON.stringify(value))}
assert.equal(CLOUD_LIST_PAGE_SIZE, 100);
assert.deepEqual(
  host(cloudPedidoIdsFromPrefixes([{ name: 'order-aaa' }, { name: '../nope' }, { name: 'order-bbb' }, { name: 'x' }])),
  ['order-aaa', 'order-bbb']
);
assert.deepEqual(host(cloudPedidoIdsFromPrefixes(['folder-one'])), ['folder-one']);
assert.deepEqual(
  host(cloudPedidoIdsFromPrefixes([
    { fullPath: 'pedidos/folio-cr1/' },
    { name: 'pedidos/folio-cr2' },
    'pedidos/folio-cr1/',
    { name: 'cr-v8-cierre_corto_blanco' }
  ])),
  ['folio-cr1', 'folio-cr2', 'cr-v8-cierre_corto_blanco']
);

const summary = summarizeCloudPedidoReads([
  { status: 'fulfilled', value: { number: 'CR', client: 'CUMBRES - RHINOS', updatedAt: '2026-02-02T00:00:00.000Z' } },
  { status: 'rejected', reason: Error('timeout') },
  { status: 'fulfilled', value: { number: 'AA', client: 'OTRO', updatedAt: '2026-03-01T00:00:00.000Z' } },
  { status: 'fulfilled', value: null }
]);
assert.equal(summary.listed, 4);
assert.equal(summary.failed, 2);
assert.equal(summary.orders[0].number, 'AA');
assert.match(cloudLibraryNotice(summary), /Se leyeron 2 de 4 pedidos/);
assert.match(cloudLibraryNotice({ orders: [], failed: 3, listed: 3 }), /no se pudo leer ningún pedido\.json/);
assert.match(
  cloudLibraryNotice({ orders: [], failed: 3, listed: 3, errors: ['Failed to fetch'] }),
  /bloqueó la descarga \(CORS\)/
);
assert.equal(cloudLibraryNotice({ orders: [{ id: 'ok' }], failed: 0, listed: 1 }), '');

test('withTimeout rejects a hanging promise', async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 20, 'La lista de pedidos tardó demasiado. Revisa la conexión e intenta de nuevo.'),
    /tardó demasiado/
  );
});

test('collectPedidoPrefixes paginates folder names only', async () => {
  const calls = [];
  const prefixes = await collectPedidoPrefixes(async options => {
    calls.push(options);
    if (!options.pageToken) {
      return { prefixes: [{ name: 'page-aa' }], items: [{ name: 'should-ignore.json' }], nextPageToken: 'tok-2' };
    }
    assert.equal(options.pageToken, 'tok-2');
    return { prefixes: [{ name: 'page-bb' }], items: [] };
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].maxResults, 100);
  assert.deepEqual(host(prefixes.map(p => p.name)), ['page-aa', 'page-bb']);
});

test('listCloudPedidoMetadata fetches pedido.json in parallel and keeps partial results', async () => {
  let inFlight = 0, maxInFlight = 0;
  const started = [];
  const result = await listCloudPedidoMetadata(
    async () => [{ name: 'folio-one' }, { name: 'folio-two' }, { name: 'folio-bad' }],
    id => new Promise((resolve, reject) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      started.push(id);
      setTimeout(() => {
        inFlight--;
        if (id === 'folio-bad') reject(Error('boom'));
        else resolve({ id, number: id === 'folio-one' ? 'CR - POLO BLANCO' : 'CR - HOODIE', client: 'CUMBRES - RHINOS', updatedAt: id });
      }, 15);
    }),
    { list: 200, pedido: 200 }
  );
  assert.deepEqual(host(started).sort(), ['folio-bad', 'folio-one', 'folio-two']);
  assert.ok(maxInFlight >= 2, 'pedido.json reads must overlap');
  assert.equal(result.orders.length, 2);
  assert.equal(result.failed, 1);
  assert.match(cloudLibraryNotice(result), /Se leyeron 2 de 3 pedidos/);
});

test('listCloudPedidoMetadata times out a hanging folder list', async () => {
  await assert.rejects(
    () => listCloudPedidoMetadata(() => new Promise(() => {}), async () => ({}), { list: 25, pedido: 25 }),
    /tardó demasiado/
  );
});

console.log('cloud helper tests passed');
