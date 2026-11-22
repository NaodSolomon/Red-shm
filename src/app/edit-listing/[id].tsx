import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FormAction, ListingForm } from '@/components/marketplace/listing-form';
import { ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { useListings } from '@/hooks/use-listings';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { records, ready, error, load } = useListings();
  const listing = records.find((record) => record.id === id);
  if (listing) return <ListingForm key={listing.id} initial={listing} />;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={{ padding: 20, gap: 12 }}>
        <SectionHeader title={ready ? 'Listing unavailable' : error ?? 'Loading saved listings…'}
          subtitle={ready ? 'Only your local listings can be edited here.' : undefined} />
        {error && <FormAction label="Retry loading" onPress={load} />}
        <FormAction label="Back to My Listings" onPress={() => router.dismissTo('/my-listings')} />
      </View>
    </ScreenContainer>
  );
}
