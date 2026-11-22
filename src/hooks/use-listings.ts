import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { products as catalogue } from '@/data/products';
import { copyPhoto, deletePhoto, resolvePhoto } from '@/lib/listing-files';
import { toProduct } from '@/lib/listings';
import { createListingStore, listingStorageKey } from '@/lib/listing-store';

const store = createListingStore({
  read: () => AsyncStorage.getItem(listingStorageKey),
  write: (value) => AsyncStorage.setItem(listingStorageKey, value),
  uuid: randomUUID, copyPhoto, deletePhoto, resolvePhoto,
});

export function useListings() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getInitialSnapshot);
  useEffect(() => { void store.load(); }, []);

  const owned = useMemo(() => snapshot.records.map((record) => toProduct(record, snapshot.photos)), [snapshot.records, snapshot.photos]);
  const products = useMemo(() => [...owned, ...catalogue], [owned]);

  return { ...snapshot, owned, products, load: store.load, save: store.save, setStatus: store.setStatus, remove: store.remove };
}
