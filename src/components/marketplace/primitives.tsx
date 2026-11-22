import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { color, serif } from '@/constants/marketplace';
import { Icon, type IconName } from './icon';

export function ScreenContainer({ children, edges = ['top', 'left', 'right'] }: PropsWithChildren<{ edges?: Edge[] }>) {
  return <SafeAreaView edges={edges} style={styles.screen}>{children}</SafeAreaView>;
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

type ActionProps = { label: string; onPress: () => void };

export function CategoryChip({ label, icon, onPress }: ActionProps & { icon: IconName }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Icon name={icon} size={17} tint={color.red} />
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled }: ActionProps & { disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      disabled={disabled} accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const currency = new Intl.NumberFormat('en-ET', {
  style: 'currency', currency: 'ETB', currencyDisplay: 'code',
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function PriceText({ amount }: { amount: number }) {
  return <Text style={styles.price}>{currency.format(amount)}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  heading: { gap: 4 },
  title: { fontFamily: serif, color: color.ink, fontSize: 26 },
  subtitle: { color: color.muted, fontSize: 14, lineHeight: 20 },
  chip: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13,
    paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: color.line, backgroundColor: color.white,
  },
  chipLabel: { color: color.ink, fontSize: 14, fontWeight: '600' },
  button: { minHeight: 48, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 24, backgroundColor: color.red },
  buttonLabel: { color: color.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.75 },
  price: { color: color.red, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
