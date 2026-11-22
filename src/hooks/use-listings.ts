import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { localListingStore as store } from '@/data/local-listing-store';
import { products as catalogue } from '@/data/products';
import { toProduct } from '@/lib/listings';
import { applyPromotions } from '@/lib/promotions';
import { usePromotions } from './use-promotions';

export function useListings() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getInitialSnapshot);
  const { promotions, now } = usePromotions();
  useEffect(() => { void store.load(); }, []);

  const owned = useMemo(() => applyPromotions(
    snapshot.records.map((record) => toProduct(record, snapshot.photos)), promotions, now,
  ), [snapshot.records, snapshot.photos, promotions, now]);
  const products = useMemo(() => [...owned, ...catalogue], [owned]);

  return { ...snapshot, owned, products, load: store.load, save: store.save, setStatus: store.setStatus, remove: store.remove };
}
