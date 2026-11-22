import { readListings, requireOwned, supportsSize, validateListing, type ListingFields, type LocalListing } from './listings';
import { photoExtension, type ListingPhoto } from './listing-photo';
import type { ListingStatus } from '@/types/marketplace';

export const listingStorageKey = 'red-shm.local-listings.v1';

interface Dependencies {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  uuid: () => string;
  copyPhoto: (name: string, asset: Extract<ListingPhoto, { asset: unknown }>['asset']) => Promise<string>;
  resolvePhoto: (name: string) => Promise<string | undefined>;
  deletePhoto: (name: string, uri?: string) => Promise<void>;
}

interface Snapshot {
  ready: boolean;
  error?: string;
  records: LocalListing[];
  photos: ReadonlyMap<string, string>;
}

export function createListingStore(io: Dependencies) {
  const initial: Snapshot = { ready: false, records: [], photos: new Map() };
  let snapshot = initial;
  let loading = false;
  let busy = false;
  const listeners = new Set<() => void>();

  function update(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  async function load() {
    if (loading || snapshot.ready) return;
    loading = true;
    update(initial);
    try {
      const records = readListings(await io.read());
      const photos = new Map<string, string>();
      await Promise.all(records.flatMap((record) => record.photos.map(async (name) => {
        const uri = await io.resolvePhoto(name).catch(() => undefined);
        if (uri) photos.set(name, uri);
      })));
      update({ ready: true, records, photos });
    } catch {
      update({ ...initial, error: 'Saved listings could not be opened. Try again before making changes.' });
    } finally {
      loading = false;
    }
  }

  async function transaction<T>(operation: () => Promise<T>) {
    if (!snapshot.ready) throw new Error('Wait for saved listings to load before making changes.');
    if (busy) throw new Error('Another listing change is being saved. Try again in a moment.');
    busy = true;
    try {
      return await operation();
    } finally {
      busy = false;
    }
  }

  async function persist(records: LocalListing[], photos = snapshot.photos) {
    try {
      await io.write(JSON.stringify(records));
    } catch {
      throw new Error('Your change could not be saved. Please try again.');
    }
    update({ ready: true, records, photos });
  }

  async function cleanup(names: string[], photos: ReadonlyMap<string, string>) {
    await Promise.all(names.map((name) => io.deletePhoto(name, photos.get(name)).catch(() => {})));
  }

  function save(fields: ListingFields, images: ListingPhoto[], id?: string) {
    return transaction(async () => {
      const previous = id ? requireOwned(snapshot.records, id) : undefined;
      const validation = validateListing(fields, images.length);
      if (validation) throw new Error(validation);
      if (!fields.category || !fields.condition || !fields.fulfillment) throw new Error('Complete the required fields.');
      const retained = new Set<string>();
      for (const image of images) {
        if ('asset' in image) continue;
        if (!previous?.photos.includes(image.name) || !snapshot.photos.has(image.name) || retained.has(image.name)) {
          throw new Error('Remove unavailable photos and choose replacements.');
        }
        retained.add(image.name);
      }

      const names: string[] = [];
      const created: string[] = [];
      const photos = new Map(snapshot.photos);
      const previousPhotos = snapshot.photos;
      const retired = previous?.photos.filter((name) => !retained.has(name)) ?? [];
      retired.forEach((name) => photos.delete(name));
      try {
        for (const image of images) {
          if ('name' in image) {
            names.push(image.name);
          } else {
            const name = `${io.uuid()}.${photoExtension(image.asset)}`;
            created.push(name);
            try {
              photos.set(name, await io.copyPhoto(name, image.asset));
            } catch (error) {
              throw new Error(error instanceof Error ? error.message : 'A selected photo could not be saved.');
            }
            names.push(name);
          }
        }

        const record: LocalListing = {
          ...fields,
          category: fields.category, condition: fields.condition, fulfillment: fields.fulfillment,
          id: previous?.id ?? `LOCAL-${io.uuid()}`,
          createdAt: previous?.createdAt ?? new Date().toISOString(),
          status: previous?.status ?? 'Active',
          title: fields.title.trim(), description: fields.description.trim(), price: fields.price.trim(),
          size: supportsSize(fields.category, fields.subcategory) ? fields.size.trim() : '',
          photos: names,
        };
        const records = previous
          ? snapshot.records.map((entry) => entry.id === previous.id ? record : entry)
          : [record, ...snapshot.records];
        await persist(records, photos);
        await cleanup(retired, previousPhotos);
        return record.id;
      } catch (error) {
        await cleanup(created, photos);
        throw error;
      }
    });
  }

  function setStatus(id: string, status: ListingStatus) {
    return transaction(async () => {
      const record = requireOwned(snapshot.records, id);
      if (record.status === status) return;
      await persist(snapshot.records.map((entry) => entry.id === id ? { ...entry, status } : entry));
    });
  }

  function remove(id: string) {
    return transaction(async () => {
      const record = requireOwned(snapshot.records, id);
      const previousPhotos = snapshot.photos;
      const photos = new Map(previousPhotos);
      record.photos.forEach((name) => photos.delete(name));
      await persist(snapshot.records.filter((entry) => entry.id !== id), photos);
      await cleanup(record.photos, previousPhotos);
    });
  }

  return {
    load, save, setStatus, remove,
    getSnapshot: () => snapshot,
    getInitialSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
