import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Choices, FormAction } from '@/components/marketplace/listing-form';
import { PriceText, PrimaryButton, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { ProductMedia } from '@/components/marketplace/product-media';
import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import { usePromotions } from '@/hooks/use-promotions';
import { promotionDurations, promotionError, type PromotionDuration } from '@/lib/promotions';

const durations = ['1 day', '3 days', '7 days'] as const;

export default function PromoteListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listings = useListings();
  const promotions = usePromotions();
  const product = listings.owned.find((entry) => entry.id === id);
  const [duration, setDuration] = useState<PromotionDuration>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);

  const loading = !listings.ready || !promotions.ready;
  const loadError = listings.error ?? promotions.error;
  const unavailable = loading ? undefined : promotionError(product, promotions.promotions, promotions.now);

  async function activate() {
    if (locked.current || !product || loading || unavailable) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await promotions.activate(product.id, duration);
      router.replace({ pathname: '/promotions', params: { activated: product.id } });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The promotion could not be activated.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <ScreenContainer edges={['left', 'right', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Promote listing" subtitle="Give your available item a spot in the marketplace’s Sponsored section." />
      {product ? <View style={styles.preview}>
        <View style={styles.photo}><ProductMedia product={product} /></View>
        <View style={styles.details}>
          <Text style={styles.title}>{product.title}</Text>
          <PriceText amount={product.price} />
          <Text style={styles.status}>Listing status · {product.status}</Text>
        </View>
      </View> : null}
      <Text style={styles.notice}>Demo promotion — no payment required or processed.</Text>
      {loadError ? <>
        <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
        <FormAction label="Try again" onPress={() => { void listings.load(); void promotions.load(); }} />
      </> : loading ? <Text style={styles.status}>Loading listing and promotion…</Text> : unavailable ? <>
        <Text style={styles.status}>{unavailable}</Text>
        <FormAction label="Manage promotions" onPress={() => router.replace('/promotions')} />
      </> : <>
        <Choices label="Promotion duration" options={durations}
          value={durations[promotionDurations.indexOf(duration)]}
          onChange={(label) => setDuration(promotionDurations[durations.indexOf(label)])} />
        <Text style={styles.status}>The listing can appear in sponsored placements while its promotion is active and the item is available.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Activating…' : 'Activate demo promotion'} disabled={busy} onPress={activate} />
      </>}
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 580, alignSelf: 'center', padding: 20, gap: 16 },
  preview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 13, padding: 11, borderWidth: 1,
    borderColor: color.line, borderRadius: 14, backgroundColor: color.white },
  photo: { width: 104, borderRadius: 9, overflow: 'hidden' },
  details: { flex: 1, minWidth: 110, gap: 5 },
  title: { color: color.ink, fontWeight: '700', fontSize: 17 },
  status: { color: color.muted, fontSize: 14, lineHeight: 21 },
  notice: { padding: 12, color: color.red, backgroundColor: color.rose, borderRadius: 10, fontWeight: '700' },
  error: { color: color.red, fontSize: 14 },
});
