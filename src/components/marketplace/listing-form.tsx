import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState, type PropsWithChildren } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import type { ListingPhoto } from '@/lib/listing-photo';
import { areas, categories, conditions, emptyFields, fulfillmentMethods, subcategories,
  supportsSize, type ListingFields, type LocalListing } from '@/lib/listings';
import { Icon } from './icon';
import { PrimaryButton, ScreenContainer, SectionHeader } from './primitives';

const conditionNotes = {
  'Like new': 'Barely used, with no visible wear.',
  'Very good': 'Light wear with no major flaws.',
  Good: 'Visible wear that you can describe or show.',
};
const fulfillmentNotes = {
  'Buyer pickup': 'The buyer collects the item in your selected area.',
  'Seller-arranged delivery': 'You arrange delivery directly with the buyer.',
  Both: 'You can offer pickup or arrange delivery.',
};

export function ListingForm({ initial }: { initial?: LocalListing }) {
  const listings = useListings();
  const [fields, setFields] = useState<ListingFields>(() => {
    if (!initial) return emptyFields;
    const { title, description, category, subcategory, condition, size, price, area, fulfillment } = initial;
    return { title, description, category, subcategory, condition, size, price, area, fulfillment };
  });
  const [photos, setPhotos] = useState<ListingPhoto[]>(() =>
    initial?.photos.map((name) => ({ name, uri: listings.photos.get(name) })) ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const locked = useRef(false);

  function edit<K extends keyof ListingFields>(key: K, value: ListingFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setError('');
  }

  async function pick() {
    if (locked.current || photos.length >= 5) return;
    locked.current = true;
    setPicking(true);
    setError('');
    try {
      // The system library picker grants access to the photos the seller selects.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5 - photos.length, quality: 1,
      });
      if (!result.canceled) {
        setPhotos((current) => [...current, ...result.assets.slice(0, 5 - current.length).map((asset) => ({ asset }))]);
      }
    } catch {
      setError('Could not open your photos. Check photo access in your device settings and try again.');
    } finally {
      locked.current = false;
      setPicking(false);
    }
  }

  async function submit() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    try {
      const id = await listings.save(fields, photos, initial?.id);
      saved = true;
      if (initial) {
        router.dismissTo({ pathname: '/my-listings', params: { notice: 'saved' } });
      } else {
        setFields(emptyFields);
        setPhotos([]);
        router.push({ pathname: '/product/[id]', params: { id, published: 'yes' } });
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The listing could not be saved.');
    } finally {
      locked.current = false;
      if (!saved || !initial) setBusy(false);
    }
  }

  const disabled = busy || picking;

  return (
    <ScreenContainer edges={initial ? ['left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <SectionHeader title={initial ? 'Edit listing' : 'Sell an item'}
            subtitle="Listings from your demo account are stored on this device." />
          <View pointerEvents={disabled ? 'none' : 'auto'} style={styles.sections}>
            <FormSection title="Photos">
              <Text style={styles.hint}>Add up to five photos. The first photo is your cover.</Text>
              {photos.length > 0 && <ScrollView horizontal contentContainerStyle={styles.photoStrip}>
                {photos.map((photo, index) => {
                  const uri = 'asset' in photo ? photo.asset.uri : photo.uri;
                  return (
                    <View key={'asset' in photo ? `${uri}-${index}` : photo.name} style={styles.photoTile}>
                      <View style={styles.preview}>
                        {uri ? <Image accessibilityLabel={`Photo ${index + 1}`} source={{ uri }} style={styles.photo} />
                          : <Text style={styles.hint}>Photo unavailable</Text>}
                      </View>
                      {index === 0 ? <Text style={styles.cover}>Cover photo</Text>
                        : <FormAction label="Make cover" accessibilityLabel={`Use photo ${index + 1} as cover`}
                          onPress={() => setPhotos((current) => [photo, ...current.filter((_, i) => i !== index)])} />}
                      <FormAction label="Remove" accessibilityLabel={`Remove photo ${index + 1}`}
                        onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))} />
                    </View>
                  );
                })}
              </ScrollView>}
              <FormAction label={picking ? 'Opening photos…' : `Add photos (${photos.length}/5)`}
                onPress={pick} disabled={photos.length >= 5 || disabled} />
            </FormSection>
            <FormSection title="Item details">
              <Field label="Title" value={fields.title} maxLength={80} onChange={(value) => edit('title', value)} />
              <Field label="Description" value={fields.description} maxLength={1500} multiline
                onChange={(value) => edit('description', value)} />
              <Choices label="Category" options={categories} value={fields.category} onChange={(category) => {
                setFields((current) => ({ ...current, category, subcategory: '', size: '' }));
                setError('');
              }} />
              {fields.category ? <Choices label="Subcategory (optional)" options={['', ...subcategories[fields.category]]}
                value={fields.subcategory} onChange={(value) => edit('subcategory', value)} /> : null}
              {supportsSize(fields.category, fields.subcategory) && <Field label="Size (optional)" value={fields.size}
                maxLength={30} onChange={(value) => edit('size', value)} />}
            </FormSection>
            <FormSection title="Condition">
              <Choices options={conditions} value={fields.condition} onChange={(value) => edit('condition', value)} />
              {conditions.map((condition) => <Text key={condition} style={styles.hint}>
                <Text style={styles.label}>{condition}</Text>{' · '}{conditionNotes[condition]}
              </Text>)}
            </FormSection>
            <FormSection title="Price">
              <Field label="Price (ETB)" value={fields.price} decimal maxLength={15} onChange={(value) => edit('price', value)} />
            </FormSection>
            <FormSection title="Location and fulfillment">
              <Choices label="Addis Ababa area" options={areas} value={fields.area} onChange={(value) => edit('area', value)} />
              <Choices label="Fulfillment" options={fulfillmentMethods} value={fields.fulfillment}
                onChange={(value) => edit('fulfillment', value as ListingFields['fulfillment'])} />
              {fulfillmentMethods.map((method) => <Text key={method} style={styles.hint}>
                <Text style={styles.label}>{method}</Text>{' · '}{fulfillmentNotes[method]}
              </Text>)}
            </FormSection>
          </View>

          {!listings.ready && <Text style={styles.hint}>{listings.error ?? 'Loading saved listings…'}</Text>}
          {listings.error && <FormAction label="Retry loading" onPress={listings.load} />}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={busy ? 'Saving…' : initial ? 'Save changes' : 'Publish listing'}
            onPress={submit} disabled={disabled || !listings.ready} />
          {initial && <FormAction label="Cancel" onPress={() => router.dismissTo('/my-listings')} disabled={disabled} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function FormSection({ children, title }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>;
}

function Field({ label, value, maxLength, onChange, multiline, decimal }: {
  label: string; value: string; maxLength: number; onChange: (value: string) => void;
  multiline?: boolean; decimal?: boolean;
}) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} maxLength={maxLength}
      multiline={multiline} inputMode={decimal ? 'decimal' : 'text'}
      style={[styles.input, multiline && styles.multiline]} />
  </View>;
}

export function Choices<T extends string>({ options, value, onChange, label }: {
  options: readonly T[]; value: string; onChange: (value: T) => void; label?: string;
}) {
  return <View style={styles.field}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={styles.choices}>
      {options.map((option) => <Pressable key={option} accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${option || 'None'}` : undefined}
        accessibilityState={{ selected: value === option }} onPress={() => onChange(option)}
        style={({ pressed }) => [styles.choice, value === option && styles.selected, pressed && styles.pressed]}>
        <Text style={styles.label}>{option || 'None'}</Text>
      </Pressable>)}
    </View>
  </View>;
}

export function FormAction({ label, onPress, disabled, accessibilityLabel }: {
  label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [styles.action, (pressed || disabled) && styles.pressed]}>
      {label.startsWith('Add photos') && <Icon name="sell" size={18} tint={color.red} />}
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignSelf: 'center', width: '100%', maxWidth: 620, padding: 20, paddingBottom: 32, gap: 17 },
  sections: { gap: 16 },
  section: { gap: 11, borderTopWidth: 1, borderColor: color.line, paddingTop: 15 },
  sectionTitle: { color: color.ink, fontSize: 18, fontWeight: '700' },
  field: { gap: 6 },
  label: { color: color.ink, fontSize: 14, fontWeight: '600' },
  hint: { color: color.muted, fontSize: 14, lineHeight: 20 },
  error: { color: color.red, backgroundColor: color.rose, padding: 12, borderRadius: 12, lineHeight: 21 },
  input: { minHeight: 48, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, borderRadius: 10, padding: 11, color: color.ink, fontSize: 16 },
  multiline: { minHeight: 106, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: color.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: color.white },
  selected: { borderColor: color.red, backgroundColor: color.rose },
  action: { minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10, gap: 6, borderWidth: 1, borderColor: color.line, borderRadius: 10 },
  actionText: { color: color.red, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.6 },
  photoStrip: { gap: 9 },
  photoTile: { width: 122, gap: 4 },
  preview: { height: 120, borderRadius: 10, overflow: 'hidden', backgroundColor: color.rose, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  cover: { minHeight: 44, textAlign: 'center', textAlignVertical: 'center', lineHeight: 22, paddingVertical: 11, fontWeight: '700', color: color.ink },
});
