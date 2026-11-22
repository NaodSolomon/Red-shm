import { demoSeller } from './listings';
import type { Product } from '@/types/marketplace';

export const promotionDurations = [1, 3, 7] as const;
export type PromotionDuration = typeof promotionDurations[number];
export const dayMs = 24 * 60 * 60 * 1000;

export interface Promotion {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  createdAt: string;
  startsAt: string;
  endsAt: string;
  duration: PromotionDuration;
  cancelledAt?: string;
}

export type PromotionListing = Pick<Product, 'id' | 'title' | 'status' | 'seller' | 'local'>;

export function promotionStatus(promotion: Promotion, now: number) {
  if (promotion.cancelledAt) return 'Cancelled';
  return now >= Date.parse(promotion.endsAt) ? 'Expired' : 'Active';
}

export function activePromotion(promotion: Promotion, now: number) {
  return promotionStatus(promotion, now) === 'Active' && Date.parse(promotion.startsAt) <= now;
}

export function promotionError(listing: PromotionListing | undefined, promotions: Promotion[], now: number) {
  if (!listing?.local || listing.seller.id !== demoSeller.id) return 'You can only promote your own listings.';
  if (listing.status !== 'Active') return 'Only active listings can be promoted.';
  if (promotions.some((promotion) => promotion.listingId === listing.id && promotion.sellerId === listing.seller.id
    && promotionStatus(promotion, now) === 'Active')) return 'This listing already has an active promotion.';
}

export function applyPromotions(products: Product[], promotions: Promotion[], now: number) {
  const byListing = new Map(promotions.filter((promotion) => activePromotion(promotion, now))
    .map((promotion) => [promotion.listingId, promotion.sellerId]));
  return products.map((product) => {
    const sponsored = product.status === 'Active'
      && (product.sponsored || (product.local === true && byListing.get(product.id) === product.seller.id));
    return sponsored === product.sponsored ? product : { ...product, sponsored };
  });
}

export function readPromotions(raw: string | null): Promotion[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Saved promotions are unreadable.');
  const ids = new Set<string>();
  return value.filter((record): record is Promotion => {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id
      || ids.has(record.id) || typeof record.listingId !== 'string' || !record.listingId.startsWith('LOCAL-')
      || typeof record.listingTitle !== 'string' || !record.listingTitle.trim() || record.listingTitle.length > 80
      || record.sellerId !== demoSeller.id
      || !promotionDurations.includes(record.duration)
      || ![record.createdAt, record.startsAt, record.endsAt].every((date) => typeof date === 'string' && Number.isFinite(Date.parse(date)))) return false;
    const start = Date.parse(record.startsAt);
    const end = Date.parse(record.endsAt);
    if (Date.parse(record.createdAt) > start || end - start !== record.duration * dayMs) return false;
    if (record.cancelledAt !== undefined) {
      const cancellation = typeof record.cancelledAt === 'string' ? Date.parse(record.cancelledAt) : NaN;
      if (!Number.isFinite(cancellation) || cancellation < start || cancellation >= end) return false;
    }
    ids.add(record.id);
    return true;
  });
}
