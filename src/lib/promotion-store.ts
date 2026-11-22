import { activePromotion, dayMs, promotionDurations, promotionError, readPromotions,
  type Promotion, type PromotionDuration, type PromotionListing } from './promotions';
import { demoSeller } from './listings';

export const promotionStorageKey = 'red-shm.promotions.v1';

interface Storage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  uuid: () => string;
  now: () => number;
  findListing: (id: string) => PromotionListing | undefined;
}

interface Snapshot {
  ready: boolean;
  error?: string;
  promotions: Promotion[];
  now: number;
}

export function createPromotionStore(io: Storage) {
  const initial: Snapshot = { ready: false, promotions: [], now: io.now() };
  let snapshot = initial;
  let loading: Promise<void> | undefined;
  let pending = Promise.resolve();
  const listeners = new Set<() => void>();

  function update(next: Snapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  async function read() {
    update(initial);
    try {
      const promotions = readPromotions(await io.read());
      update({ ready: true, promotions, now: io.now() });
    } catch {
      update({ ...initial, error: 'Saved promotions could not be opened. Try again.' });
    }
  }

  async function load() {
    if (snapshot.ready) return;
    loading ??= read().finally(() => { loading = undefined; });
    await loading;
  }

  function serialize(operation: () => Promise<void>) {
    const result = pending.then(async () => {
      await load();
      if (!snapshot.ready) throw new Error(snapshot.error);
      await operation();
    });
    pending = result.then(() => {}, () => {});
    return result;
  }

  async function persist(promotions: Promotion[]) {
    try {
      await io.write(JSON.stringify(promotions));
    } catch {
      throw new Error('The promotion change could not be saved. Try again.');
    }
    update({ ready: true, promotions, now: io.now() });
  }

  function activate(listingId: string, duration: PromotionDuration) {
    return serialize(async () => {
      const now = io.now();
      const listing = io.findListing(listingId);
      const error = promotionError(listing, snapshot.promotions, now);
      if (error || !listing) throw new Error(error ?? 'This listing is unavailable.');
      if (!promotionDurations.includes(duration)) throw new Error('Choose a 1-, 3-, or 7-day duration.');
      const timestamp = new Date(now).toISOString();
      await persist([{
        id: io.uuid(), listingId, listingTitle: listing.title, sellerId: listing.seller.id,
        createdAt: timestamp, startsAt: timestamp, endsAt: new Date(now + duration * dayMs).toISOString(), duration,
      }, ...snapshot.promotions]);
    });
  }

  function cancel(id: string) {
    return serialize(async () => {
      const now = io.now();
      const promotion = snapshot.promotions.find((entry) => entry.id === id && entry.sellerId === demoSeller.id);
      if (!promotion || !activePromotion(promotion, now)) throw new Error('This promotion is no longer active.');
      await persist(snapshot.promotions.map((entry) => entry.id === id ? { ...entry, cancelledAt: new Date(now).toISOString() } : entry));
    });
  }

  return {
    load, activate, cancel,
    refreshTime: () => update({ ...snapshot, now: io.now() }),
    getSnapshot: () => snapshot,
    getInitialSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
