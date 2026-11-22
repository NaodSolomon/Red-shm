import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormAction } from '@/components/marketplace/listing-form';
import { PrimaryButton, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { SellerIdentity } from '@/components/marketplace/seller-preview';
import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import { demoSeller } from '@/lib/listings';

export default function ProfileScreen() {
  const { records, ready, error, load } = useListings();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Profile" />
        <View style={styles.card}>
          <SellerIdentity seller={demoSeller} />
          <Text style={styles.demo}>Demo account</Text>
          <Text style={styles.body}>Listings are stored on this device for the local prototype.</Text>
        </View>
        {ready ? <View style={styles.counts}>
          <Text style={styles.count}>{records.filter((item) => item.status === 'Active').length} active</Text>
          <Text style={styles.count}>{records.filter((item) => item.status === 'Sold').length} sold</Text>
        </View> : <Text style={styles.body}>{error ?? 'Loading saved listings…'}</Text>}
        {error && <FormAction label="Retry loading" onPress={load} />}
        <PrimaryButton label="My Listings" onPress={() => router.push('/my-listings')} />
        <FormAction label="Manage promotions" onPress={() => router.push('/promotions')} />
        <FormAction label="Create listing" onPress={() => router.navigate('/sell')} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, gap: 16 },
  card: { gap: 10, padding: 16, borderWidth: 1, borderColor: color.line, borderRadius: 14, backgroundColor: color.white },
  demo: { color: color.red, fontWeight: '700' },
  body: { color: color.muted, fontSize: 15, lineHeight: 21 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  count: { fontSize: 16, color: color.ink, fontWeight: '700' },
});
