import type { ImageSourcePropType } from 'react-native';

export type ProductCategory = 'Traditional wear' | 'Accessories' | 'Everyday fashion' | 'Home & tech';
export type ProductCondition = 'Like new' | 'Very good' | 'Good';
export type ListingStatus = 'Active' | 'Reserved' | 'Sold';

export interface User {
  id: string;
  name: string;
}

export interface Seller extends User {
  neighborhood: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  size?: string;
  images: ImageSourcePropType[];
  seller: Seller;
  location: string;
  createdAt: string;
  status: ListingStatus;
  sponsored: boolean;
}
