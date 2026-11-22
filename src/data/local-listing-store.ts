import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { copyPhoto, deletePhoto, resolvePhoto } from '@/lib/listing-files';
import { createListingStore, listingStorageKey } from '@/lib/listing-store';

export const localListingStore = createListingStore({
  read: () => AsyncStorage.getItem(listingStorageKey),
  write: (value) => AsyncStorage.setItem(listingStorageKey, value),
  uuid: randomUUID, copyPhoto, deletePhoto, resolvePhoto,
});
