import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, serif } from '@/constants/marketplace';
import { Icon, type IconName } from './icon';
import { PrimaryButton, ScreenContainer, SectionHeader } from './primitives';

export function EmptyState({ screen, icon, title, description }: {
  screen: string;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title={screen} />
        <View style={styles.message}>
          <View style={styles.icon}><Icon name={icon} size={30} tint={color.red} /></View>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <PrimaryButton label="Back to Home" onPress={() => router.navigate('/')} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', padding: 22 },
  message: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 36 },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: color.rose },
  title: { color: color.ink, fontFamily: serif, fontSize: 30, textAlign: 'center' },
  description: { maxWidth: 290, textAlign: 'center', color: color.muted, fontSize: 16, lineHeight: 24, marginBottom: 6 },
});
