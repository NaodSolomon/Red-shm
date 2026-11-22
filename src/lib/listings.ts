import type { ListingStatus, Product, ProductCategory, ProductCondition, Seller } from '@/types/marketplace';

export const demoSeller: Seller = {
  id: 'local-demo-seller', name: 'Red-shm Demo Seller', neighborhood: '', city: 'Addis Ababa',
};

export const categories: ProductCategory[] = ['Traditional wear', 'Accessories', 'Everyday fashion', 'Home & tech'];
export const conditions: ProductCondition[] = ['Like new', 'Very good', 'Good'];
export const statuses: ListingStatus[] = ['Active', 'Reserved', 'Sold'];
export const areas = ['Bole', 'CMC', 'Ayat', 'Piassa', 'Kazanchis', 'Megenagna', 'Sarbet', 'Mexico', 'Gerji', 'Summit'];
export const fulfillmentMethods = ['Buyer pickup', 'Seller-arranged delivery', 'Both'] as const;
export type Fulfillment = typeof fulfillmentMethods[number];

export const subcategories: Record<ProductCategory, string[]> = {
  'Traditional wear': ['Habesha Kemis', 'Netela & Shawls', 'Gabi', 'Wedding & Occasion', 'Traditional Outerwear', 'Traditional Sets', "Men's Traditional Wear"],
  Accessories: ['Cultural Accessories', 'Jewelry', 'Bags'],
  'Everyday fashion': ["Women's Fashion", "Men's Fashion", 'Shoes', 'Bags'],
  'Home & tech': ['Electronics', 'Home & Living'],
};

export function supportsSize(category: string, subcategory: string) {
  return category === 'Traditional wear' || (category === 'Everyday fashion' && subcategory !== 'Bags');
}

export interface ListingFields {
  title: string;
  description: string;
  category: ProductCategory | '';
  subcategory: string;
  condition: ProductCondition | '';
  size: string;
  price: string;
  area: string;
  fulfillment: Fulfillment | '';
}

export interface LocalListing extends ListingFields {
  id: string;
  category: ProductCategory;
  condition: ProductCondition;
  fulfillment: Fulfillment;
  createdAt: string;
  status: ListingStatus;
  photos: string[];
}

export const emptyFields: ListingFields = {
  title: '', description: '', category: '', subcategory: '', condition: '', size: '', price: '', area: '', fulfillment: '',
};

export function validateListing(fields: ListingFields, photoCount: number) {
  if (photoCount < 1 || photoCount > 5) return 'Choose between one and five photos.';
  if (!fields.title.trim() || fields.title.trim().length > 80) return 'Enter a title of up to 80 characters.';
  const description = fields.description.trim();
  if (description.length < 15 || description.length > 1500 || !/\p{L}/u.test(description)) {
    return 'Describe the item in 15 to 1,500 characters.';
  }
  if (!fields.category || !categories.includes(fields.category)) return 'Choose a category.';
  if (fields.subcategory && !subcategories[fields.category].includes(fields.subcategory)) return 'Choose a subcategory for this category.';
  if (!fields.condition || !conditions.includes(fields.condition)) return 'Choose a condition.';
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(fields.price.trim()) || Number(fields.price) <= 0) {
    return 'Enter a positive ETB price with up to two decimal places.';
  }
  if (!areas.includes(fields.area)) return 'Choose a pickup or delivery area.';
  if (!fields.fulfillment || !fulfillmentMethods.includes(fields.fulfillment)) return 'Choose a fulfillment method.';
  if (fields.size.trim().length > 30) return 'Enter a size of up to 30 characters.';
}

export const photoNamePattern = /^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|heic|heif|gif|avif|bmp)$/i;
const localIdPattern = /^LOCAL-[a-f0-9-]{36}$/i;

export function readListings(raw: string | null): LocalListing[] {
  if (raw === null) return [];
  const records: unknown = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error('Saved listing data is unreadable.');

  const ids = new Set<string>();
  const photos = new Set<string>();
  return records.filter((record): record is LocalListing => {
    if (!record || typeof record !== 'object') return false;
    if (!Object.keys(emptyFields).every((key) => typeof record[key] === 'string')) return false;
    if (typeof record.id !== 'string' || !localIdPattern.test(record.id) || ids.has(record.id)) return false;
    if (typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt)) || !statuses.includes(record.status)) return false;
    if (!Array.isArray(record.photos) || new Set(record.photos).size !== record.photos.length
      || !record.photos.every((name: unknown) => typeof name === 'string' && photoNamePattern.test(name) && !photos.has(name))) return false;
    if (validateListing(record, record.photos.length)) return false;
    ids.add(record.id);
    record.photos.forEach((name: string) => photos.add(name));
    return true;
  });
}

export function toProduct(listing: LocalListing, photos: ReadonlyMap<string, string>): Product {
  return {
    id: listing.id, title: listing.title, description: listing.description, category: listing.category,
    subcategory: listing.subcategory || undefined, condition: listing.condition, size: listing.size || undefined,
    price: Number(listing.price), fulfillment: listing.fulfillment, seller: demoSeller, local: true,
    location: `${listing.area}, Addis Ababa`, createdAt: listing.createdAt, status: listing.status, sponsored: false,
    images: listing.photos.map((name) => ({ uri: photos.get(name) || '' })),
  };
}

export function requireOwned(records: LocalListing[], id: string) {
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error('This listing is no longer available to manage.');
  return record;
}
