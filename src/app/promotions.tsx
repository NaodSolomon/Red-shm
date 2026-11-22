import { Link, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatDialog, ChatThumbnail } from '@/components/marketplace/conversation-ui';
import { FormAction } from '@/components/marketplace/listing-form';
import { PrimaryButton, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import { usePromotions } from '@/hooks/use-promotions';
import { activePromotion, promotionStatus, type Promotion } from '@/lib/promotions';

const timestamp = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Addis_Ababa',
});

function days(duration: number) {
  return `${duration} ${duration === 1 ? 'day' : 'days'}`;
}

function remaining(promotion: Promotion, now: number) {
  if (!activePromotion(promotion, now)) return 'No time remaining';
  const minutes = Math.max(1, Math.ceil((Date.parse(promotion.endsAt) - now) / 60_000));
  const fullDays = Math.floor(minutes / 1440);
  if (fullDays > 0) {
    const hours = Math.floor(minutes % 1440 / 60);
    return `${days(fullDays)}${hours ? ` ${hours} hr` : ''} remaining`;
  }
  return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min remaining` : `${minutes} min remaining`;
}

export default function PromotionsScreen() {
  const promotions = usePromotions();
  const listings = useListings();
  const { activated } = useLocalSearchParams<{ activated?: string }>();
  const [confirmation, setConfirmation] = useState<Promotion>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);

  async function cancel() {
    if (!confirmation || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await promotions.cancel(confirmation.id);
      setConfirmation(undefined);
      if (activated) router.setParams({ activated: '' });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The promotion could not be cancelled.');
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }

  return <ScreenContainer edges={['left', 'right', 'bottom']}>
    <FlatList data={promotions.promotions} keyExtractor={(promotion) => promotion.id} style={styles.list}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.header}>
        <SectionHeader title="Your promotions" subtitle="Review active promotions and past activity. Times are shown in Addis Ababa." />
        {activated ? <Text accessibilityLiveRegion="polite" style={styles.notice}>Demo promotion activated.</Text> : null}
      </View>}
      ListEmptyComponent={<View style={styles.empty}>
        <SectionHeader title={promotions.error ?? (promotions.ready ? 'No promotions yet' : 'Loading promotions…')}
          subtitle={promotions.ready ? 'Choose an active item from My Listings to try a demo promotion.' : undefined} />
        {promotions.error ? <FormAction label="Try again" onPress={promotions.load} />
          : promotions.ready ? <FormAction label="My Listings" onPress={() => router.navigate('/my-listings')} /> : null}
      </View>}
      renderItem={({ item }) => {
        const listing = listings.owned.find((product) => product.id === item.listingId);
        const status = promotionStatus(item, promotions.now);
        const active = activePromotion(item, promotions.now);
        const identity = <>
          <ChatThumbnail source={listing?.images[0]} />
          <View style={styles.details}>
            <Text style={styles.title}>{listing?.title ?? item.listingTitle}</Text>
            <Text style={styles.body}>{listing ? `Listing status · ${listing.status}`
              : listings.ready ? 'Listing unavailable' : 'Loading listing…'}</Text>
          </View>
        </>;
        return <View style={styles.card}>
          {listing ? <Link href={{ pathname: '/product/[id]', params: { id: listing.id } }} asChild>
            <Pressable style={styles.identity}>{identity}</Pressable>
          </Link> : <View style={styles.identity}>{identity}</View>}
          <View style={styles.meta}>
            <Text style={[styles.badge, active && styles.active]}>{status}</Text>
            <Text style={styles.body}>{days(item.duration)} · {remaining(item, promotions.now)}</Text>
          </View>
          <View style={styles.dates}>
            <Text style={styles.body}>Starts · {timestamp.format(new Date(item.startsAt))}</Text>
            <Text style={styles.body}>Ends · {timestamp.format(new Date(item.endsAt))}</Text>
            {item.cancelledAt ? <Text style={styles.body}>Cancelled · {timestamp.format(new Date(item.cancelledAt))}</Text> : null}
          </View>
          {active && listing?.status !== 'Active'
            ? <Text style={styles.body}>{listing ? 'Sponsored placement is paused while this listing is unavailable.'
              : 'Sponsored placement is unavailable without the listing.'}</Text> : null}
          {active ? <FormAction label="Cancel promotion" onPress={() => { setError(''); setConfirmation(item); }} /> : null}
        </View>;
      }}
    />
    {confirmation ? <ChatDialog title="Cancel this promotion?" busy={busy} onClose={() => setConfirmation(undefined)}>
      <Text style={styles.body}>Sponsored placement will end. The listing will keep its current availability.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Yes, cancel promotion" disabled={busy} onPress={cancel} />
      <FormAction label="Keep promotion" disabled={busy} onPress={() => setConfirmation(undefined)} />
    </ChatDialog> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center' },
  content: { padding: 20, paddingBottom: 28 },
  header: { gap: 10, marginBottom: 14 },
  notice: { color: color.red, backgroundColor: color.rose, padding: 10, borderRadius: 9, fontWeight: '700' },
  empty: { paddingVertical: 20, gap: 12 },
  card: { gap: 10, padding: 12, marginBottom: 12, backgroundColor: color.white, borderRadius: 14, borderColor: color.line, borderWidth: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  details: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 16, color: color.ink, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, color: color.muted },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { color: color.ink, backgroundColor: color.sand, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, fontWeight: '700' },
  active: { backgroundColor: color.rose, color: color.red },
  dates: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderColor: color.line },
  error: { color: color.red },
});
