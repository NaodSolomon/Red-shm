import type { Product, ProductCategory } from '@/types/marketplace';

export const sortOptions = ['Newest first', 'Price: low to high', 'Price: high to low'] as const;

export interface Filters {
  category: ProductCategory | '';
  minimum: string;
  maximum: string;
  condition: string;
  location: string;
  size: string;
  sort: typeof sortOptions[number];
}

export const defaultFilters: Filters = {
  category: '', minimum: '', maximum: '', condition: '', location: '', size: '', sort: 'Newest first',
};

function listingTime(product: Product) {
  const timestamp = Date.parse(product.createdAt);
  return Number.isFinite(timestamp) ? timestamp : -Infinity;
}

export function newestFirst(left: Product, right: Product) {
  const leftTime = listingTime(left);
  const rightTime = listingTime(right);
  if (leftTime === rightTime) return 0;
  return leftTime > rightTime ? -1 : 1;
}

export function priceError(minimum: string, maximum: string) {
  const valid = (value: string) => !value.trim() || (/^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number.isFinite(Number(value)));
  if (!valid(minimum) || !valid(maximum)) return 'Enter a valid ETB amount with up to two decimal places.';
  if (maximum.trim() && Number(minimum) > Number(maximum)) return 'Maximum price must be at least the minimum price.';
}

export function discover(products: Product[], query: string, filters: Filters) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const minimum = filters.minimum.trim() ? Number(filters.minimum) : 0;
  const maximum = filters.maximum.trim() ? Number(filters.maximum) : Infinity;
  const matches = products.filter((product) => {
    const text = [product.title, product.description, product.category].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term))
      && (!filters.category || filters.category === product.category)
      && (!filters.condition || filters.condition === product.condition)
      && (!filters.location || filters.location === product.location)
      && (!filters.size || filters.size === product.size)
      && product.price >= minimum && product.price <= maximum;
  });

  if (filters.sort === 'Price: low to high') return matches.sort((left, right) => left.price - right.price);
  if (filters.sort === 'Price: high to low') return matches.sort((left, right) => right.price - left.price);
  return matches.sort(newestFirst);
}

export function gridRows<T>(items: T[], columns: number) {
  return Array.from({ length: Math.ceil(items.length / columns) }, (_, index) =>
    items.slice(index * columns, (index + 1) * columns));
}
