import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/marketplace/empty-state';

export default function SearchScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();

  return (
    <EmptyState screen="Search" icon="search" title={category || 'Find your next favorite'}
      description="Marketplace search is coming. Browse the preview on Home for now." />
  );
}
