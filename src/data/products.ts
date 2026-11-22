import dataset from '../../imports/RedShm_Stage3_Mock_Dataset.json';
import type { ListingStatus, Product, ProductCategory, ProductCondition, Seller } from '@/types/marketplace';
import { productCovers, sellerAvatars } from './mock-images';

const conditions: Record<string, ProductCondition | undefined> = {
  'Like new': 'Like new',
  'Very good': 'Very good',
  Good: 'Good',
};

const statuses: Record<string, ListingStatus | undefined> = {
  Active: 'Active',
  Reserved: 'Reserved',
  Sold: 'Sold',
};

export const sellers: Seller[] = dataset.sellers.map((seller) => ({
  id: seller.sellerId,
  name: seller.displayName,
  neighborhood: seller.area,
  city: seller.city,
  handle: seller.handle,
  bio: seller.bio,
  avatar: sellerAvatars[seller.sellerId],
}));

const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));

function categoryGroup(category: string, kind: string): ProductCategory {
  if (category === 'Cultural Accessories') return 'Accessories';
  if (kind === 'cultural') return 'Traditional wear';
  if (category === 'Electronics' || category === 'Home & Living') return 'Home & tech';
  return 'Everyday fashion';
}

export const products: Product[] = dataset.listings.map((listing) => {
  const seller = sellersById.get(listing.sellerId);
  const condition = conditions[listing.condition];
  const status = statuses[listing.status];
  const cover = productCovers[listing.listingId];

  if (!seller || !condition || !status) {
    throw new Error(`Invalid mock catalogue record: ${listing.listingId}`);
  }

  return {
    id: listing.listingId,
    title: listing.title,
    description: listing.description,
    price: listing.priceEtb,
    category: categoryGroup(listing.category, listing.kind),
    subcategory: listing.category,
    condition,
    size: listing.size === 'N/A' ? undefined : listing.size,
    images: cover ? [cover] : [],
    seller,
    location: `${listing.area}, ${listing.city}`,
    status,
    sponsored: listing.sponsored,
  };
});
