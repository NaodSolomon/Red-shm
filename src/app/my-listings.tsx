import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFavorites } from '@/components/marketplace/favorites';
import { Choices, FormAction } from '@/components/marketplace/listing-form';
import { PrimaryButton, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { ProductCard } from '@/components/marketplace/product-card';
import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import { usePromotions } from '@/hooks/use-promotions';
import { statuses } from '@/lib/listings';
import { promotionError } from '@/lib/promotions';
import type { ListingStatus, Product } from '@/types/marketplace';

type Change = { product: Product; status: ListingStatus | 'Delete' };

export default function MyListingsScreen() {
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const listings = useListings();
  const promotions = usePromotions();
  const { forget } = useFavorites();
  const [filter, setFilter] = useState<ListingStatus | 'All'>('All');
  const [managing, setManaging] = useState<string>();
  const [confirmation, setConfirmation] = useState<Change>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const visible = listings.owned.filter((product) => filter === 'All' || filter === product.status);

  async function apply({ product, status }: Change) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      if (status === 'Delete') {
        await listings.remove(product.id);
        forget(product.id);
      } else {
        await listings.setStatus(product.id, status);
      }
      setConfirmation(undefined);
      setManaging(undefined);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The change could not be saved.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <FlatList data={visible} keyExtractor={(item) => item.id} style={styles.list}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ProductCard product={item} />
            <Text style={styles.status}>Status · {item.status}</Text>
            <View style={styles.actions}>
              <FormAction label="Edit" disabled={busy} onPress={() => router.push({ pathname: '/edit-listing/[id]', params: { id: item.id } })} />
              <FormAction label="Change status" disabled={busy} onPress={() => setManaging(managing === item.id ? undefined : item.id)} />
              <FormAction label="Delete" disabled={busy} onPress={() => { setError(''); setConfirmation({ product: item, status: 'Delete' }); }} />
              {promotions.ready && !promotionError(item, promotions.promotions, promotions.now)
                ? <FormAction label="Promote listing" disabled={busy}
                  onPress={() => router.push({ pathname: '/promote/[id]', params: { id: item.id } })} /> : null}
            </View>
            {managing === item.id && <Choices label="Listing status" options={statuses} value={item.status} onChange={(status) => {
              if (status === item.status || locked.current) return;
              if (status === 'Sold') { setError(''); setConfirmation({ product: item, status }); }
              else void apply({ product: item, status });
            }} />}
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader title="Your local listings" subtitle="Manage items published from your demo account." />
            {notice === 'saved' && <Text accessibilityLiveRegion="polite" style={styles.notice}>Listing updated.</Text>}
            <PrimaryButton label="Create listing" onPress={() => router.navigate('/sell')} />
            <FormAction label="Manage promotions" onPress={() => router.push('/promotions')} />
            <Choices options={['All', ...statuses]} value={filter} onChange={setFilter} />
            {!!error && !confirmation && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <SectionHeader title={listings.ready ? (filter === 'All' ? 'No listings yet' : `No ${filter.toLowerCase()} listings`) : listings.error ?? 'Loading saved listings…'} />
            {listings.error && <FormAction label="Retry loading" onPress={listings.load} />}
          </View>
        }
      />
      {!!confirmation && <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmation(undefined); }}>
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <SectionHeader title={confirmation.status === 'Delete' ? 'Delete listing?' : 'Mark as sold?'} />
            <Text style={styles.body}>{confirmation.status === 'Delete'
              ? `“${confirmation.product.title}” and its saved photos will be removed from this device.`
              : `“${confirmation.product.title}” will be marked unavailable to buyers.`}</Text>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <PrimaryButton label={confirmation.status === 'Delete' ? 'Delete listing' : 'Mark as sold'}
              disabled={busy} onPress={() => apply(confirmation)} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmation(undefined)} style={styles.cancel}>
              <Text style={styles.status}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', alignSelf: 'center', maxWidth: 560 },
  content: { padding: 20, paddingBottom: 28 },
  header: { gap: 12, marginBottom: 14 },
  notice: { color: color.red, fontWeight: '700' },
  item: { gap: 8, marginBottom: 20 },
  status: { color: color.ink, fontWeight: '700', fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { paddingVertical: 30, gap: 12 },
  overlay: { flex: 1, backgroundColor: '#32232099', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 410, padding: 20, borderRadius: 16, backgroundColor: color.paper, gap: 12 },
  body: { color: color.muted, fontSize: 15, lineHeight: 21 },
  error: { color: color.red },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
