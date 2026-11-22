const assert = require('node:assert/strict');
const { test } = require('node:test');
const { source } = require('./source.cjs');
const dataset = require('../imports/RedShm_Stage3_Mock_Dataset.json');

const seller = { id: 'local-demo-seller' };
const listing = { id: 'LOCAL-01', title: 'Ivory kemis', local: true, seller, status: 'Active',
  sponsored: false, category: 'Traditional wear', price: 800, condition: 'Like new', location: 'Bole, Addis Ababa',
  description: 'Ivory cotton dress' };

function storage() {
  let raw = null;
  let sequence = 0;
  let now = Date.parse('2026-11-22T15:00:00Z');
  const listings = new Map([[listing.id, listing]]);
  const io = {
    now: () => now,
    uuid: () => 'promotion-' + ++sequence,
    findListing: (id) => listings.get(id),
    read: async () => raw,
    write: async (value) => { raw = value; },
  };
  return { listings, io, advance: (offset) => { now += offset; } };
}

test('activates a promotion once, reloads it, expires at its exact deadline and allows renewal', async () => {
  const { createPromotionStore } = await source('lib/promotion-store.ts');
  const { applyPromotions, dayMs, promotionStatus } = await source('lib/promotions.ts');
  const { io, advance } = storage();
  const store = createPromotionStore(io);
  const first = store.activate(listing.id, 3);
  const duplicate = assert.rejects(store.activate(listing.id, 1), /already has an active promotion/);
  await first;
  await duplicate;
  const [promotion] = store.getSnapshot().promotions;
  assert.equal(promotion.sellerId, seller.id);
  assert.equal(Date.parse(promotion.startsAt), io.now());
  assert.equal(Date.parse(promotion.endsAt) - Date.parse(promotion.startsAt), 3 * dayMs);
  assert.equal(applyPromotions([listing], [promotion], io.now())[0].sponsored, true);
  assert.equal(applyPromotions([listing], [promotion], io.now() - 1)[0].sponsored, false);

  const reloaded = createPromotionStore(io);
  await reloaded.load();
  assert.deepEqual(reloaded.getSnapshot().promotions, [promotion]);
  advance(3 * dayMs - 1);
  assert.equal(promotionStatus(promotion, io.now()), 'Active');
  advance(1);
  reloaded.refreshTime();
  assert.equal(promotionStatus(promotion, reloaded.getSnapshot().now), 'Expired');
  assert.equal(applyPromotions([listing], [promotion], io.now())[0].sponsored, false);
  await assert.rejects(reloaded.cancel(promotion.id), /no longer active/);
  await reloaded.activate(listing.id, 7);
  assert.equal(reloaded.getSnapshot().promotions.length, 2);
});

test('guards ownership, availability, supported duration and repeated cancellation', async () => {
  const { createPromotionStore } = await source('lib/promotion-store.ts');
  const { promotionStatus, applyPromotions } = await source('lib/promotions.ts');
  const { io, listings } = storage();
  listings.set('RSH-001', { ...listing, id: 'RSH-001', local: false, seller: { id: 'SEL-001' } });
  const store = createPromotionStore(io);
  await assert.rejects(store.activate('RSH-001', 1), /your own/);
  await assert.rejects(store.activate('LOCAL-missing', 1), /your own/);
  await assert.rejects(store.activate(listing.id, 2), /Choose a 1-/);
  for (const status of ['Sold', 'Reserved']) {
    listings.set(listing.id, { ...listing, status });
    await assert.rejects(store.activate(listing.id, 1), /Only active/);
  }
  listings.set(listing.id, listing);
  await store.activate(listing.id, 1);
  await store.cancel(store.getSnapshot().promotions[0].id);
  const reloaded = createPromotionStore(io);
  await reloaded.load();
  const [cancelled] = reloaded.getSnapshot().promotions;
  assert.equal(promotionStatus(cancelled, io.now()), 'Cancelled');
  assert.equal(applyPromotions([listing], [cancelled], io.now())[0].sponsored, false);
  assert.equal(listings.get(listing.id).status, 'Active');
  await assert.rejects(reloaded.cancel(cancelled.id), /no longer active/);
});

test('only marks eligible results, preserves seeded sponsorships and respects explicit price ordering', async () => {
  const { applyPromotions } = await source('lib/promotions.ts');
  const { createPromotionStore } = await source('lib/promotion-store.ts');
  const { discover, defaultFilters } = await source('lib/discovery.ts');
  const { io, listings } = storage();
  const store = createPromotionStore(io);
  await store.activate(listing.id, 1);
  const { promotions } = store.getSnapshot();
  const now = io.now();
  for (const status of ['Reserved', 'Sold']) {
    assert.equal(applyPromotions([{ ...listing, status }], promotions, now)[0].sponsored, false);
  }
  assert.equal(applyPromotions([{ ...listing, seller: { id: 'SEL-001' } }], promotions, now)[0].sponsored, false);
  assert.equal(applyPromotions([listing], promotions, now)[0].sponsored, true);
  listings.delete(listing.id);
  assert.deepEqual(applyPromotions([...listings.values()], promotions, now), []);

  const organic = { ...listing, id: 'RSH-010', local: false, price: 1400 };
  const seeded = { ...organic, id: 'RSH-001', sponsored: true, price: 1200 };
  const unrelated = { ...seeded, id: 'RSH-025', title: 'Speaker', category: 'Home & tech', description: '' };
  const catalogue = applyPromotions([organic, listing, seeded, unrelated], promotions, now);
  const filters = { ...defaultFilters, category: 'Traditional wear' };
  for (const [sort, prices] of [['Price: low to high', [800, 1200, 1400]], ['Price: high to low', [1400, 1200, 800]]]) {
    const results = discover(catalogue, 'kemis', { ...filters, sort });
    assert.deepEqual(results.map((entry) => entry.price), prices);
    assert.equal(results.filter((entry) => entry.sponsored).length, 2);
  }
  assert.equal(listing.sponsored, false);
  assert.equal(dataset.listings.filter((entry) => entry.sponsored).length, 10);
});

test('retains valid saved promotions and reports storage failures without caching unsaved changes', async () => {
  const { createPromotionStore } = await source('lib/promotion-store.ts');
  const { io } = storage();
  const store = createPromotionStore(io);
  await store.activate(listing.id, 3);
  const [valid] = store.getSnapshot().promotions;
  const broken = createPromotionStore({ ...io,
    read: async () => JSON.stringify([null, { ...valid, id: 'bad', endsAt: 'not-a-date' }, valid, valid]),
    write: async () => { throw new Error('quota'); },
  });
  await broken.load();
  assert.deepEqual(broken.getSnapshot().promotions, [valid]);
  await assert.rejects(broken.cancel(valid.id), /could not be saved/);
  assert.deepEqual(broken.getSnapshot().promotions, [valid]);
  const unreadable = createPromotionStore({ ...io, read: async () => '{' });
  await unreadable.load();
  assert.match(unreadable.getSnapshot().error, /could not be opened/);
});
