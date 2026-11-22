import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useEffect, useSyncExternalStore } from 'react';

import { products } from '@/data/products';
import { createConversationStore, conversationStorageKey } from '@/lib/conversation-store';
import { copyPhoto, deletePhoto, resolvePhoto } from '@/lib/listing-files';

const directory = 'red-shm-chat-attachments';
const store = createConversationStore({
  read: () => AsyncStorage.getItem(conversationStorageKey),
  write: (data) => AsyncStorage.setItem(conversationStorageKey, data),
  uuid: randomUUID,
  copy: (name, asset) => copyPhoto(name, asset, directory),
  resolve: (name) => resolvePhoto(name, directory),
  remove: (name, uri) => deletePhoto(name, uri, directory),
}, products);

export function useConversations() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getInitialSnapshot);
  useEffect(() => { void store.load(); }, []);
  return { ...snapshot, load: store.load, open: store.open, send: store.send, attach: store.attach, markRead: store.markRead };
}
