const assert = require('node:assert/strict');
const { test } = require('node:test');
const { source } = require('./source.cjs');

const seller = { id: 'SEL-001', name: 'Liya Bekele' };
const product = { id: 'RSH-004', seller, status: 'Active', fulfillment: 'Both' };
const buyerId = 'local-demo-buyer';
const image = { uri: 'file:///picker/test.png', mimeType: 'image/png' };
const arrangement = {
  method: 'Buyer pickup', day: '2026-12-01', time: '10:15', area: 'Bole public plaza', instructions: 'Meet near the entrance.',
};

function storage() {
  let value = null;
  let sequence = 0;
  const files = new Map();
  return {
    files,
    read: async () => value,
    write: async (data) => { value = data; },
    uuid: () => '00000000-0000-4000-8000-' + String(++sequence).padStart(12, '0'),
    copy: async (name) => {
      const uri = 'file:///chat/' + name;
      files.set(name, uri);
      return uri;
    },
    resolve: async (name) => files.get(name),
    remove: async (name) => { files.delete(name); },
  };
}

test('opens, deduplicates, saves and reopens a product chat with messages, photos and unread state', async () => {
  const { createConversationStore } = await source('lib/conversation-store.ts');
  const io = storage();
  const store = createConversationStore(io, []);
  const [id, duplicate] = await Promise.all([store.open(product), store.open(product)]);
  assert.equal(id, duplicate);
  assert.equal(store.getSnapshot().conversations.length, 1);
  await assert.rejects(store.open({ ...product, id: 'RSH-005', status: 'Sold' }), /unavailable/);
  await assert.rejects(store.open({ ...product, seller: { id: 'local-demo-seller' } }), /other participant/);
  assert.equal(await store.open({ ...product, status: 'Reserved' }), id);
  await assert.rejects(store.send(id, 'stranger', { type: 'text', text: 'Hello' }), /participant/);
  await assert.rejects(store.send(id, buyerId, { type: 'text', text: ' ' }), /Enter a message/);
  await store.send(id, buyerId, { type: 'text', text: ' Is it available?\nCan we meet on Saturday? ' });
  await store.attach(id, seller.id, 'image', image);
  const before = store.getSnapshot().conversations[0];
  assert.deepEqual(before.messages.map((message) => message.type), ['text', 'image']);
  assert.equal(before.messages[0].text, 'Is it available?\nCan we meet on Saturday?');
  assert.ok(before.messages[0].timestamp <= before.messages[1].timestamp);
  assert.deepEqual(before.unread, { buyer: true, seller: false });
  assert.equal(before.messages[1].delivery, 'local');
  await store.markRead(id, buyerId);

  const restored = createConversationStore(io, []);
  await restored.load();
  const after = restored.getSnapshot().conversations[0];
  assert.equal(after.productId, product.id); // The catalogue no longer contains the product.
  assert.deepEqual(after.messages, before.messages);
  assert.equal(after.unread.buyer, false);
  assert.equal(restored.getSnapshot().attachments.get(after.messages[1].attachment), [...io.files.values()][0]);
});

test('requires buyer evidence and explicit seller confirmation, then coordinates pickup and completion', async () => {
  const { createConversationStore } = await source('lib/conversation-store.ts');
  const io = storage();
  const store = createConversationStore(io, []);
  const id = await store.open(product);
  const current = () => store.getSnapshot().conversations[0];
  await assert.rejects(store.send(id, seller.id, { type: 'system', event: 'confirm' }), /outstanding/);
  await assert.rejects(store.attach(id, seller.id, 'payment', image), /Only the buyer/);
  await store.attach(id, buyerId, 'payment', image);
  assert.equal(current().status, 'Payment Claimed');
  assert.equal(current().payment, 'Payment Claimed');
  await assert.rejects(store.send(id, buyerId, { type: 'system', event: 'confirm' }), /Only the seller/);
  await assert.rejects(store.send(id, seller.id, { type: 'system', event: 'complete' }), /arranged/);
  await store.send(id, seller.id, { type: 'system', event: 'confirm' });
  assert.equal(current().status, 'Seller Confirmed Receipt');
  assert.ok(Date.parse(current().messages.at(-1).timestamp));
  await assert.rejects(store.attach(id, buyerId, 'payment', image), /before receipt/);
  await assert.rejects(store.send(id, buyerId, {
    type: 'system', event: 'arrange', arrangement: { ...arrangement, day: '2026-02-30' },
  }), /valid day/);
  await store.send(id, buyerId, { type: 'system', event: 'arrange', arrangement });
  await assert.rejects(store.send(id, buyerId, { type: 'system', event: 'complete' }), /Only the seller/);
  await store.send(id, seller.id, { type: 'system', event: 'complete' });
  assert.equal(current().status, 'Completed');
  assert.equal(current().payment, 'Seller Confirmed Receipt');
  await assert.rejects(store.send(id, seller.id, { type: 'system', event: 'cancel' }), /closed/);
  await store.send(id, buyerId, { type: 'text', text: 'Thank you.' });
  const restored = createConversationStore(io, []);
  await restored.load();
  assert.deepEqual(restored.getSnapshot().conversations[0], current());
});

test('keeps listing files separate, rolls back failed attachments and validates corrupted data', async () => {
  const { createConversationStore } = await source('lib/conversation-store.ts');
  const io = storage();
  const owner = { ...product, id: 'LOCAL-test', seller: { id: 'local-demo-seller' }, fulfillment: 'Seller-arranged delivery' };
  const store = createConversationStore(io, []);
  const id = await store.open(owner, 'seller');
  await assert.rejects(store.send(id, buyerId, { type: 'system', event: 'arrange', arrangement }), /supported/);
  await store.send(id, buyerId, { type: 'system', event: 'arrange',
    arrangement: { ...arrangement, method: 'Seller-arranged delivery' } });
  const failing = createConversationStore({ ...io, write: async () => { throw Error('quota'); } }, []);
  await assert.rejects(failing.attach(id, buyerId, 'image', image), /could not be saved/);
  assert.equal(io.files.size, 0);
  assert.equal(failing.getSnapshot().conversations[0].messages.length, 1);
  const invalid = createConversationStore({ ...io, read: async () => '{' }, []);
  await invalid.load();
  assert.equal(invalid.getSnapshot().ready, false);
  const raw = JSON.parse(await io.read());
  raw[0].messages.unshift(null, { ...raw[0].messages[0], senderId: 'stranger' });
  const restored = createConversationStore({ ...io, read: async () => JSON.stringify([null, ...raw]) }, []);
  await restored.load();
  assert.equal(restored.getSnapshot().conversations[0].messages.length, 1);
  assert.equal(restored.getSnapshot().conversations[0].status, 'Fulfillment Arranged');
  await store.send(id, buyerId, { type: 'system', event: 'cancel' });
  assert.equal(store.getSnapshot().conversations[0].status, 'Cancelled');
});

test('seeds clearly labeled examples only once using catalogue references', async () => {
  const { createConversationStore } = await source('lib/conversation-store.ts');
  const io = storage();
  const catalog = [{ ...product, id: 'RSH-001' }, { ...product, id: 'RSH-006' }];
  const store = createConversationStore(io, catalog);
  await store.load();
  const seeded = store.getSnapshot().conversations;
  assert.equal(seeded.length, 2);
  assert.ok(seeded.every((thread) => thread.messages[0].example));
  const next = createConversationStore(io, catalog);
  await next.load();
  assert.deepEqual(next.getSnapshot().conversations, seeded);
});
