const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { test } = require('node:test');
const ts = require('typescript');

// Use the app's TypeScript with Node's test runner and the existing TypeScript dependency.
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return next(specifier + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      const { outputText } = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext },
      });
      return { format: 'module', source: outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});

function source(path) {
  return import(pathToFileURL(resolve(__dirname, '..', 'src', path)).href);
}

const fields = {
  title: ' Ivory wedding kemis ', description: 'Worn once with intact woven gold trim.',
  category: 'Traditional wear', subcategory: 'Habesha Kemis', condition: 'Like new', size: 'M',
  price: '1500.25', area: 'Ayat', fulfillment: 'Both',
};
const photo = { asset: { uri: 'file:///picker/photo.png', mimeType: 'image/png' } };

function storage() {
  let sequence = 0;
  let raw = null;
  const files = new Map();
  const deleted = [];
  const io = {
    read: async () => raw,
    write: async (data) => { raw = data; },
    uuid: () => '00000000-0000-4000-8000-' + String(++sequence).padStart(12, '0'),
    copyPhoto: async (name) => {
      const uri = 'file:///documents/' + name;
      files.set(name, uri);
      return uri;
    },
    resolvePhoto: async (name) => files.get(name),
    deletePhoto: async (name) => { deleted.push(name); files.delete(name); },
  };
  return { io, files, deleted, raw: () => raw };
}

test('publishes, reloads, discovers, edits, reserves, sells and removes an owned listing', async () => {
  const { createListingStore } = await source('lib/listing-store.ts');
  const { toProduct, demoSeller } = await source('lib/listings.ts');
  const { discover, defaultFilters } = await source('lib/discovery.ts');
  const { io, files, deleted } = storage();
  const store = createListingStore(io);
  await store.load();
  const id = await store.save(fields, [photo]);
  const before = store.getSnapshot().records[0];
  assert.match(id, /^LOCAL-/);
  assert.equal(before.title, fields.title.trim());
  assert.ok(Date.parse(before.createdAt));
  assert.match(before.photos[0], /\.png$/);
  assert.equal(files.size, 1);

  const relaunched = createListingStore(io);
  await relaunched.load();
  const snapshot = relaunched.getSnapshot();
  assert.deepEqual(snapshot.records, [before]);
  const product = toProduct(snapshot.records[0], snapshot.photos);
  assert.equal(product.seller.id, demoSeller.id);
  assert.equal(product.sponsored, false);
  assert.equal(product.images[0].uri, files.get(before.photos[0]));
  assert.equal(discover([product], 'KEMIS', {
    ...defaultFilters, category: 'Traditional wear', condition: 'Like new', location: 'Ayat, Addis Ababa',
    minimum: '1500', maximum: '1600',
  })[0].id, id);

  await relaunched.setStatus(id, 'Reserved');
  await relaunched.save({ ...fields, title: 'Updated kemis', price: '1600' }, [photo, { name: before.photos[0] }], id);
  const edited = relaunched.getSnapshot().records[0];
  assert.equal(edited.title, 'Updated kemis');
  assert.equal(edited.createdAt, before.createdAt);
  assert.equal(edited.status, 'Reserved');
  assert.equal(edited.photos[1], before.photos[0]);
  await relaunched.save(fields, [{ name: edited.photos[0] }], id);
  assert.deepEqual(deleted, [before.photos[0]]);
  await relaunched.setStatus(id, 'Sold');
  assert.equal(relaunched.getSnapshot().records[0].status, 'Sold');
  await relaunched.remove(id);
  assert.equal(files.size, 0);
  const after = createListingStore(io);
  await after.load();
  assert.deepEqual(after.getSnapshot().records, []);
});

test('rejects invalid forms, duplicate writes, and mutations of seeded or nonexistent records', async () => {
  const { createListingStore } = await source('lib/listing-store.ts');
  const { io } = storage();
  const store = createListingStore(io);
  await store.load();
  await assert.rejects(store.save(fields, []), /photos/);
  await assert.rejects(store.save({ ...fields, title: '  ' }, [photo]), /title/);
  await assert.rejects(store.save({ ...fields, description: '  ' }, [photo]), /Describe/);
  await assert.rejects(store.save({ ...fields, price: '3.141' }, [photo]), /positive ETB/);
  await assert.rejects(store.save(fields, [photo], 'RSH-001'), /no longer available/);
  await assert.rejects(store.setStatus('RSH-001', 'Sold'), /no longer available/);
  await assert.rejects(store.remove('RSH-001'), /no longer available/);
  const publishing = store.save(fields, [photo]);
  await assert.rejects(store.save(fields, [photo]), /Another listing change/);
  await publishing;
  assert.equal(store.getSnapshot().records.length, 1);
});

test('handles missing files, corrupt records, and failed metadata writes without losing saved photos', async () => {
  const { createListingStore } = await source('lib/listing-store.ts');
  const { io, files, raw } = storage();
  const store = createListingStore(io);
  await store.load();
  const id = await store.save(fields, [photo]);
  const previous = store.getSnapshot().records[0];
  const failing = createListingStore({ ...io, write: async () => { throw Error('quota'); } });
  await failing.load();
  await assert.rejects(failing.save(fields, [photo], id), /could not be saved/);
  await assert.rejects(failing.remove(id), /could not be saved/);
  assert.deepEqual(failing.getSnapshot().records, [previous]);
  assert.deepEqual([...files.keys()], previous.photos);
  const interrupted = createListingStore({
    ...io,
    copyPhoto: async (name, asset) => {
      await io.copyPhoto(name, asset);
      throw Error('Photo copy interrupted');
    },
  });
  await interrupted.load();
  await assert.rejects(interrupted.save(fields, [photo], id), /Photo copy interrupted/);
  assert.deepEqual(interrupted.getSnapshot().records, [previous]);
  assert.deepEqual([...files.keys()], previous.photos);
  const partial = createListingStore({
    ...io, read: async () => JSON.stringify([null, { id: 'RSH-001' }, ...JSON.parse(raw())]),
    resolvePhoto: async () => undefined,
  });
  await partial.load();
  assert.deepEqual(partial.getSnapshot().records, [previous]);
  assert.equal(partial.getSnapshot().photos.size, 0);
  const corrupt = createListingStore({ ...io, read: async () => '{' });
  await corrupt.load();
  assert.equal(corrupt.getSnapshot().ready, false);
  assert.match(corrupt.getSnapshot().error, /could not be opened/);
});

test('preserves the 60 seeded records and their seller and asset references', () => {
  const dataset = require('../imports/RedShm_Stage3_Mock_Dataset.json');
  const registry = readFileSync(resolve(__dirname, '../src/data/mock-images.ts'), 'utf8');
  assert.equal(dataset.sellers.length, 12);
  assert.equal(dataset.listings.length, 60);
  assert.equal((registry.match(/require\(/g) || []).length, 72);
  for (const seller of dataset.sellers) {
    assert.ok(registry.includes("'" + seller.sellerId + "':"));
    assert.equal(dataset.listings.filter((listing) => listing.sellerId === seller.sellerId).length, 5);
  }
});
