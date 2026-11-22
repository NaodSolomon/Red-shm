import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { color } from '@/constants/marketplace';
import { products } from '@/data/products';
import { defaultFilters, priceError, sortOptions, type Filters } from '@/lib/discovery';
import type { ProductCategory } from '@/types/marketplace';
import { PrimaryButton } from './primitives';

const categories = [...new Set(products.map((product) => product.category))];
const conditions = [...new Set(products.map((product) => product.condition))];
const locations = [...new Set(products.map((product) => product.location))].sort();
const sizes = [...new Set(products.flatMap((product) => product.size ? [product.size] : []))].sort();

export function readCategory(value: string | undefined): Filters['category'] {
  return value && categories.includes(value as ProductCategory) ? value as ProductCategory : '';
}

function Options<T extends string>({ label, values, selected, onSelect }: {
  label: string;
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {values.map((value) => (
          <Pressable key={value} accessibilityRole="button"
            accessibilityState={{ selected: value === selected }} onPress={() => onSelect(value)}
            accessibilityLabel={value || `Any ${label.toLowerCase()}`}
            style={[styles.option, selected === value && styles.selected]}>
            <Text style={styles.optionText}>{value || 'Any'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function DiscoveryFilters({ initial, onApply }: {
  initial: Filters;
  onApply: (filters: Filters) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const error = priceError(draft.minimum, draft.maximum);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <View style={styles.panel}>
      <Options label="Category" values={['', ...categories]} selected={draft.category}
        onSelect={(value) => update('category', value)} />
      <View style={styles.field}>
        <Text style={styles.label}>Price range (ETB)</Text>
        <View style={styles.prices}>
          <TextInput accessibilityLabel="Minimum price" placeholder="Min" placeholderTextColor={color.muted}
            inputMode="decimal" value={draft.minimum} onChangeText={(value) => update('minimum', value)} style={styles.input} />
          <TextInput accessibilityLabel="Maximum price" placeholder="Max" placeholderTextColor={color.muted}
            inputMode="decimal" value={draft.maximum} onChangeText={(value) => update('maximum', value)} style={styles.input} />
        </View>
        {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
      </View>
      <Options label="Condition" values={['', ...conditions]} selected={draft.condition}
        onSelect={(value) => update('condition', value)} />
      <Options label="Location" values={['', ...locations]} selected={draft.location}
        onSelect={(value) => update('location', value)} />
      <Options label="Size" values={['', ...sizes]} selected={draft.size}
        onSelect={(value) => update('size', value)} />
      <Options label="Sort by" values={sortOptions} selected={draft.sort}
        onSelect={(value) => update('sort', value)} />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.reset} onPress={() => onApply(defaultFilters)}>
          <Text style={styles.resetText}>Reset filters</Text>
        </Pressable>
        <PrimaryButton label="Apply filters" disabled={Boolean(error)} onPress={() => onApply(draft)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, padding: 14, gap: 16, borderWidth: 1, borderColor: color.line, backgroundColor: color.white },
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: '700', color: color.ink },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { minHeight: 44, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: color.line, borderRadius: 12 },
  selected: { backgroundColor: color.rose, borderColor: color.red },
  optionText: { fontSize: 13, color: color.ink },
  prices: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 10, color: color.ink, borderRadius: 10, borderWidth: 1, borderColor: color.line },
  error: { color: color.red, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reset: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 6 },
  resetText: { color: color.red, fontWeight: '700' },
});
