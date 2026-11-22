import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { localListingStore } from '@/data/local-listing-store';
import { demoSeller } from '@/lib/listings';
import { createPromotionStore, promotionStorageKey } from '@/lib/promotion-store';

const store = createPromotionStore({
  read: () => AsyncStorage.getItem(promotionStorageKey),
  write: (value) => AsyncStorage.setItem(promotionStorageKey, value),
  uuid: randomUUID, now: Date.now,
  findListing: (id) => {
    const listing = localListingStore.getSnapshot().records.find((record) => record.id === id);
    if (listing) return { id, title: listing.title, status: listing.status, seller: demoSeller, local: true };
  },
});

type PromotionContextValue = ReturnType<typeof store.getSnapshot> & {
  load: typeof store.load;
  activate: typeof store.activate;
  cancel: typeof store.cancel;
};

const PromotionContext = createContext<PromotionContextValue | null>(null);

export function PromotionProvider({ children }: PropsWithChildren) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getInitialSnapshot);
  useEffect(() => { void store.load(); }, []);

  useEffect(() => {
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') store.refreshTime();
    });
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      const now = Date.now();
      const boundaries = snapshot.promotions.filter((promotion) => !promotion.cancelledAt)
        .flatMap((promotion) => [Date.parse(promotion.startsAt), Date.parse(promotion.endsAt)])
        .filter((time) => time > now);
      if (boundaries.length > 0) {
        const delay = Math.min(60_000, ...boundaries.map((time) => time - now));
        timer = setTimeout(() => { store.refreshTime(); schedule(); }, delay);
      }
    }
    schedule();
    return () => { appState.remove(); clearTimeout(timer); };
  }, [snapshot.promotions]);

  return <PromotionContext.Provider value={{
    ...snapshot, load: store.load, activate: store.activate, cancel: store.cancel,
  }}>{children}</PromotionContext.Provider>;
}

export function usePromotions() {
  const context = useContext(PromotionContext);
  if (!context) throw new Error('PromotionProvider is required.');
  return context;
}
