import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, radius, spacing } from '@/theme/theme';
import type { TrainingPlan } from './MarketplaceScreen';

export default function MarketplacePlanScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const plan = route.params?.plan as TrainingPlan | undefined;

  if (!plan) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This training plan is unavailable.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const contactCoach = () => {
    Alert.alert(
      'Sample listing',
      'This example plan is for preview only. Coach contact will be enabled when live marketplace listings are connected.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to marketplace"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>PLAN PREVIEW</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: plan.accent }]}>
        <View style={styles.heroIcon}>
          <Ionicons name={plan.icon} size={30} color="#fff" />
        </View>
        <Text style={styles.heroSport}>{plan.sport.toUpperCase()} TRAINING</Text>
        <Text style={styles.heroTitle}>{plan.title}</Text>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>{plan.duration}</Text>
          <View style={styles.heroDot} />
          <Text style={styles.heroMetaText}>{plan.level}</Text>
        </View>
      </View>

      <View style={styles.coachRow}>
        <View style={styles.coachAvatar}>
          <Ionicons name="person" size={17} color="#fff" />
        </View>
        <View style={styles.coachCopy}>
          <Text style={styles.coachLabel}>COACH</Text>
          <Text style={styles.coachName}>{plan.coach}</Text>
        </View>
        <View style={styles.sampleTag}><Text style={styles.sampleTagText}>SAMPLE</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>The plan</Text>
        <Text style={styles.description}>{plan.teaser}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's included</Text>
        {plan.sessions.map((item) => (
          <View key={item} style={styles.includedRow}>
            <Ionicons name="checkmark-circle" size={18} color="#19836F" />
            <Text style={styles.includedText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.purchaseRow}>
        <View>
          <Text style={styles.priceLabel}>PLAN PRICE</Text>
          <Text style={styles.price}>${plan.price}<Text style={styles.priceUnit}> USD</Text></Text>
        </View>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={contactCoach}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={17} color="#fff" />
          <Text style={styles.contactButtonText}>Contact coach</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.priceNote}>One-time example price. No purchase is available for sample listings.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  headerLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  hero: { minHeight: 202, borderRadius: radius.md, padding: spacing.md, justifyContent: 'flex-end' },
  heroIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF30', marginBottom: spacing.md },
  heroSport: { color: '#FFFFFFCC', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 25, lineHeight: 30, fontWeight: '900', marginTop: 4 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 8 },
  heroMetaText: { color: '#FFFFFFE8', fontSize: 12, fontWeight: '700' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFFB8' },
  coachRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  coachAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy, marginRight: spacing.sm },
  coachCopy: { flex: 1 },
  coachLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  coachName: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  sampleTag: { borderRadius: radius.sm, backgroundColor: '#FFF2D8', paddingHorizontal: 8, paddingVertical: 5 },
  sampleTagText: { color: '#80551C', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  section: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: spacing.sm },
  description: { color: '#4F5967', fontSize: 13, lineHeight: 20 },
  includedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 9 },
  includedText: { color: '#3F4855', fontSize: 12, fontWeight: '600', flex: 1 },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.md },
  priceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  price: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  priceUnit: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  contactButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.sm, paddingHorizontal: 14, backgroundColor: '#174F49' },
  contactButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  priceNote: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'right', marginTop: 7 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  missingText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  backLink: { marginTop: spacing.md, padding: spacing.sm },
  backLinkText: { color: colors.blue, fontSize: 14, fontWeight: '800' },
});