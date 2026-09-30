import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/theme/theme';

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A';
}

export default function ProfileHubScreen() {
  const navigation = useNavigation<any>();
  const { profile, session } = useAuth();
  const name = profile?.full_name || 'Athlete';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
      <Text style={styles.title}>Profile</Text>

      <TouchableOpacity
        style={styles.identity}
        onPress={() => navigation.navigate('AthleteProfile')}
        activeOpacity={0.78}
        accessibilityRole="button"
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email} numberOfLines={1}>{session?.user.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>TRAINING</Text>
      <TouchableOpacity
        style={styles.marketplace}
        onPress={() => navigation.navigate('Marketplace')}
        activeOpacity={0.86}
        accessibilityRole="button"
      >
        <View style={styles.marketplaceTopline}>
          <View style={styles.marketplaceIcon}>
            <Ionicons name="compass-outline" size={21} color="#fff" />
          </View>
          <Ionicons name="arrow-forward" size={19} color="#fff" />
        </View>
        <Text style={styles.marketplaceTitle}>Training marketplace</Text>
        <Text style={styles.marketplaceSubtitle}>
          Find a coach-built plan for your next goal.
        </Text>
        <View style={styles.sportMarks}>
          <View style={[styles.sportMark, { backgroundColor: '#0D8F86' }]}>
            <Ionicons name="water" size={15} color="#fff" />
          </View>
          <View style={[styles.sportMark, { backgroundColor: '#2769C5' }]}>
            <Ionicons name="bicycle" size={15} color="#fff" />
          </View>
          <View style={[styles.sportMark, { backgroundColor: '#CF7133' }]}>
            <Ionicons name="walk" size={15} color="#fff" />
          </View>
          <Text style={styles.sportCaption}>Swim · Bike · Run · More</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>PROFILE & SETTINGS</Text>
      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => navigation.navigate('AthleteProfile')}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <View style={styles.optionIcon}>
          <Ionicons name="person-outline" size={18} color={colors.blue} />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>Athlete profile</Text>
          <Text style={styles.optionSubtitle}>Race goals, training zones and reminders</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => navigation.getParent()?.navigate('Library')}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <View style={[styles.optionIcon, styles.libraryIcon]}>
          <Ionicons name="barbell-outline" size={18} color="#C76B32" />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>Workout library</Text>
          <Text style={styles.optionSubtitle}>Browse your completed sessions</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 3, marginBottom: spacing.md },
  identity: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    marginRight: spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  marketplace: {
    overflow: 'hidden',
    backgroundColor: '#174F49',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  marketplaceTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marketplaceIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#267C70',
  },
  marketplaceTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: spacing.md },
  marketplaceSubtitle: { color: '#D5E9E3', fontSize: 13, marginTop: 4 },
  sportMarks: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  sportMark: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  sportCaption: { color: '#D5E9E3', fontSize: 11, fontWeight: '700', marginLeft: 5 },
  optionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  optionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  libraryIcon: { backgroundColor: '#FFF0E6' },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  optionSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
});