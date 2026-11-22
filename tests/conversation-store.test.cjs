const assert = require('node:assert/strict');
const { test } = require('node:test');
const { source } = require('./source.cjs');

const seller = { id: 'SEL-001', name: 'Liya Bekele' };
const product = { id: 'RSH-004', seller, status: 'Active', fulfillment: 'Both' };
const buyerId = 'local-demo-buyer';
const image = { uri: 'file:///picker/test.png', mimeType: 'image/png' };
const arrangement = {
  method: 'Buyer pickup', day: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  time: '10:15', area: 'Bole public plaza', instructions: 'Meet near the entrance.',
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
  await store.attach(id, buyerId, 'image', { uri: 'content://photos/12', mimeType: 'IMAGE/JPG' });
  await store.attach(id, seller.id, 'image', image);
  const before = store.getSnapshot().conversations[0];
  assert.deepEqual(before.messages.map((message) => message.type), ['text', 'image', 'image']);
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
  assert.equal(restored.getSnapshot().attachments.get(after.messages[2].attachment), [...io.files.values()][1]);
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
    type: 'system', event: 'propose', arrangement: { ...arrangement, day: '2026-02-30' },
  }), /valid calendar date/);
  await store.send(id, buyerId, { type: 'system', event: 'propose', arrangement });
  const proposalId = current().fulfillment.id;
  assert.equal(current().arrangement, undefined);
  assert.equal(current().status, 'Seller Confirmed Receipt');
  await assert.rejects(store.send(id, seller.id, { type: 'system', event: 'complete' }), /after approval/);
  await assert.rejects(store.send(id, buyerId, { type: 'system', event: 'respond', proposalId, decision: 'Accepted' }), /other participant/);
  await store.send(id, seller.id, { type: 'system', event: 'respond', proposalId, decision: 'Accepted' });
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
  await assert.rejects(store.send(id, buyerId, { type: 'system', event: 'propose', arrangement }), /supported/);
  await store.send(id, buyerId, { type: 'system', event: 'request-delivery' });
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
  assert.equal(restored.getSnapshot().conversations[0].status, 'Inquiry');
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

test('uses Addis civil dates across UTC, month and year boundaries and normalizes AM/PM', async () => {
  const { addisNow, quickDates, normalizeTime, scheduleError } = await source('lib/fulfillment-time.ts');
  const { sellerArea } = await source('lib/fulfillment.ts');
  const friday = new Date('2027-12-30T22:30:00Z');
  assert.deepEqual(addisNow(friday), { day: '2027-12-31', time: '01:30' });
  assert.deepEqual(quickDates(friday).map((entry) => entry.day),
    ['2028-01-01', '2028-01-02', '2028-01-01', '2028-01-02']);
  assert.deepEqual(quickDates(new Date('2028-01-01T12:00:00Z')).slice(2).map((entry) => entry.day),
    ['2028-01-08', '2028-01-02']);
  assert.equal(quickDates(new Date('2028-02-28T12:00:00Z'))[0].day, '2028-02-29');
  assert.equal(normalizeTime('4:00 AM'), normalizeTime('04:00 AM'));
  assert.equal(normalizeTime('4:00 PM'), '16:00');
  assert.equal(normalizeTime('12:00 AM'), '00:00');
  assert.equal(normalizeTime('12:00 PM'), '12:00');
  assert.equal(normalizeTime('13:00 PM'), undefined);
  assert.equal(normalizeTime('04:65 AM'), undefined);
  assert.match(scheduleError('2027-12-30', '23:59', friday), /future date/);
  assert.match(scheduleError('2027-12-31', '1:00 AM', friday), /has not passed/);
  assert.equal(scheduleError('2028-01-01', '01:00 AM', friday), undefined);
  assert.equal(sellerArea({ neighborhood: ' Bole ' }), 'Bole');
  assert.equal(sellerArea({ neighborhood: '' }), '');
  assert.equal(sellerArea(undefined), '');
});

test('delivery requires a buyer request, a seller proposal and a current buyer approval', async () => {
  const { createConversationStore } = await source('lib/conversation-store.ts');
  const io = storage();
  const store = createConversationStore(io, []);
  const id = await store.open(product);
  const current = () => store.getSnapshot().conversations[0];
  const send = (actor, event) => store.send(id, actor, { type: 'system', ...event });
  const delivery = { ...arrangement, method: 'Seller-arranged delivery', time: '4:00 PM' };
  await assert.rejects(send(seller.id, { event: 'propose', arrangement: delivery }), /requests/);
  await assert.rejects(send(seller.id, { event: 'request-delivery' }), /Only the buyer/);
  await send(buyerId, { event: 'request-delivery' });
  await assert.rejects(send(buyerId, { event: 'request-delivery' }), /already pending/);
  await assert.rejects(send(seller.id, { event: 'complete' }), /after approval/);
  assert.equal(current().fulfillment.state, 'Requested');
  const proposal = () => ({ event: 'propose', arrangement: delivery, replaces: current().fulfillment.id });
  await assert.rejects(send(buyerId, proposal()), /Only the seller/);
  await send(seller.id, proposal());
  const first = current().fulfillment.id;
  assert.equal(current().messages.at(-1).arrangement.time, '16:00');
  await assert.rejects(send(seller.id, proposal()), /already awaiting/);
  const respond = (proposalId, decision) => ({ event: 'respond', proposalId, decision });
  await assert.rejects(send(seller.id, respond(first, 'Accepted')), /other participant/);
  await send(buyerId, respond(first, 'Declined'));
  assert.equal(current().fulfillment.state, 'Declined');
  assert.equal(current().arrangement, undefined);

  await send(seller.id, proposal());
  const second = current().fulfillment.id;
  await send(buyerId, respond(second, 'Changes Requested'));
  await send(seller.id, { ...proposal(), arrangement: { ...delivery, area: 'CMC' } });
  const third = current().fulfillment.id;
  await assert.rejects(send(buyerId, respond(second, 'Accepted')), /no longer awaiting/);
  await send(buyerId, respond(third, 'Accepted'));
  await assert.rejects(send(buyerId, respond(third, 'Accepted')), /no longer awaiting/);
  assert.equal(current().status, 'Fulfillment Arranged');
  assert.equal(current().payment, 'No claim');
  assert.equal(current().arrangement.area, 'CMC');

  await send(seller.id, { ...proposal(), arrangement: { ...delivery, area: 'Ayat' } });
  const fourth = current().fulfillment.id;
  assert.equal(current().arrangement.area, 'CMC');
  await assert.rejects(send(seller.id, { event: 'complete' }), /after approval/);
  const restored = createConversationStore(io, []);
  await restored.load();
  assert.deepEqual(restored.getSnapshot().conversations[0], current());
  await send(buyerId, { event: 'cancel' });
  await assert.rejects(send(buyerId, respond(fourth, 'Accepted')), /closed/);
});

test('keeps Stage 5 histories and completed status without inventing fulfillment approval', async () => {
  const { createConversation, demoBuyer } = await source('lib/conversations.ts');
  const { readConversations } = await source('lib/read-conversations.ts');
  const timestamp = '2026-11-22T12:00:00Z';
  const thread = createConversation(product, timestamp);
  const base = { conversationId: thread.id, type: 'system', timestamp, delivery: 'local' };
  const legacy = { ...base, id: 'legacy', senderId: demoBuyer.id, event: 'arrange', arrangement };
  const complete = { ...base, id: 'done', senderId: seller.id, event: 'complete' };
  const [open] = readConversations(JSON.stringify([{ ...thread, status: 'Fulfillment Arranged', messages: [legacy] }]));
  const [done] = readConversations(JSON.stringify([{ ...thread, status: 'Completed', messages: [legacy, complete] }]));
  assert.equal(open.status, 'Inquiry');
  assert.equal(open.arrangement, undefined);
  assert.deepEqual(open.legacyArrangement, arrangement);
  assert.equal(done.status, 'Completed');
  assert.equal(done.arrangement, undefined);
  assert.deepEqual(done.messages, [legacy, complete]);
});
