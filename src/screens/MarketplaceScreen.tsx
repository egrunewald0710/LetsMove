import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme/theme';

type AssignedCoach = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string;
  specialties: string[];
};

export type TrainingPlan = {
  id: string;
  title: string;
  sport: string;
  coach: string;
  duration: string;
  level: string;
  price: number;
  summary: string;
  teaser: string;
  sessions: string[];
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
};

const plans: TrainingPlan[] = [
  {
    id: 'first-1500', title: 'Your first 1,500 metres', sport: 'Swim', coach: 'Avery Brooks',
    duration: '8 weeks', level: 'Beginner', price: 39,
    summary: 'Build calm, efficient open-water confidence from the pool outward.',
    teaser: 'A measured progression from relaxed technique work to continuous distance. Each week balances skill, aerobic endurance, and recovery so your first open-water event feels familiar.',
    sessions: ['3 swims each week', 'Technique-first progression', 'Open-water skills block'],
    icon: 'water', accent: '#138A82',
  },
  {
    id: 'run-10k', title: '10K pace builder', sport: 'Run', coach: 'Maya Foster',
    duration: '10 weeks', level: 'Intermediate', price: 54,
    summary: 'A steady mileage build with just enough speed to make race pace stick.',
    teaser: 'Four purposeful runs per week build from a reliable aerobic base toward a controlled 10K effort. Workouts include clear pace guidance and room to adapt around a busy schedule.',
    sessions: ['4 runs each week', 'Threshold and interval sessions', 'Taper week included'],
    icon: 'walk', accent: '#D87835',
  },
  {
    id: 'half-marathon', title: 'Half marathon, well paced', sport: 'Run', coach: 'Jordan Reid',
    duration: '12 weeks', level: 'Intermediate', price: 64,
    summary: 'Turn consistent training into a confident, even-paced finish.',
    teaser: 'Long runs grow gradually while midweek sessions improve strength and pace control. A simple effort-based structure keeps the plan useful across changing terrain and conditions.',
    sessions: ['4-5 runs each week', 'Progressive long runs', 'Race-week pacing guide'],
    icon: 'walk', accent: '#D87835',
  },
  {
    id: 'sprint-tri', title: 'First sprint triathlon', sport: 'Triathlon', coach: 'Casey Lin',
    duration: '12 weeks', level: 'Beginner', price: 79,
    summary: 'Learn to bring three sports together, including your first transitions.',
    teaser: 'A balanced introduction to swim, bike, and run training. Short brick sessions and transition practice make race day feel like a sequence you have rehearsed.',
    sessions: ['2 swims, 2 rides, 2 runs weekly', 'Brick workouts', 'Transition practice'],
    icon: 'trophy', accent: '#3B6EAA',
  },
  {
    id: 'half-distance', title: '70.3 endurance foundation', sport: 'Triathlon', coach: 'Morgan Ellis',
    duration: '16 weeks', level: 'Advanced', price: 119,
    summary: 'A durable build for athletes ready to prepare across all three sports.',
    teaser: 'Progressive volume, race-specific bricks, and planned recovery weeks create a sustainable path to the start line. The plan includes guidance for adapting sessions to your current training zones.',
    sessions: ['6-8 sessions each week', 'Race-specific brick sessions', 'Recovery weeks built in'],
    icon: 'trophy', accent: '#3B6EAA',
  },
  {
    id: 'endurance-strength', title: 'Strength for endurance', sport: 'Strength', coach: 'Taylor Brooks',
    duration: '6 weeks', level: 'All levels', price: 34,
    summary: 'Short, focused strength sessions designed to support swim, bike, and run.',
    teaser: 'Two equipment-flexible sessions per week focus on single-leg stability, trunk strength, and durable movement patterns without overwhelming your sport-specific training.',
    sessions: ['2 sessions each week', 'Minimal-equipment options', 'Movement video library'],
    icon: 'barbell', accent: '#825F37',
  },
];

const filters = ['All', 'Swim', 'Bike', 'Run', 'Triathlon', 'Strength'];

export default function MarketplaceScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [assignedCoaches, setAssignedCoaches] = useState<AssignedCoach[]>([]);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [openingCoachId, setOpeningCoachId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignedCoaches() {
      if (!session?.user.id) {
        setAssignedCoaches([]);
        setCoachLoading(false);
        return;
      }

      setCoachLoading(true);
      setCoachError(null);
      const { data: assignments, error: assignmentError } = await (supabase
        .from('coach_athletes') as any)
        .select('coach_id')
        .eq('athlete_id', session.user.id)
        .eq('status', 'active');

      if (cancelled) return;
      if (assignmentError) {
        setCoachError('Could not load your coach assignment. Please try again.');
        setCoachLoading(false);
        return;
      }

      const coachIds: string[] = Array.from(new Set<string>((assignments ?? []).map((item: { coach_id: string }) => item.coach_id)));
      if (!coachIds.length) {
        setAssignedCoaches([]);
        setCoachLoading(false);
        return;
      }

      const [{ data: profiles, error: profileError }, { data: coaches, error: coachErrorResult }] = await Promise.all([
        (supabase.from('profiles') as any)
          .select('id,full_name,avatar_url')
          .in('id', coachIds),
        (supabase.from('coaches') as any)
          .select('user_id,bio,specialties')
          .in('user_id', coachIds)
          .eq('is_active', true),
      ]);

      if (cancelled) return;
      if (profileError || coachErrorResult) {
        setCoachError('Could not load your coach details. Please try again.');
        setCoachLoading(false);
        return;
      }

      const profilesById = new Map<string, { full_name: string | null; avatar_url: string | null }>(
        (profiles ?? []).map((profile: { id: string; full_name: string | null; avatar_url: string | null }) => [profile.id, profile])
      );
      const coachesById = new Map<string, { bio: string; specialties: string[] }>(
        (coaches ?? []).map((coach: { user_id: string; bio: string; specialties: string[] }) => [coach.user_id, coach])
      );
      setAssignedCoaches(coachIds.flatMap((id: string) => {
        const coach = coachesById.get(id);
        if (!coach) return [];
        const profile = profilesById.get(id);
        return [{
          id,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          bio: coach.bio ?? '',
          specialties: coach.specialties ?? [],
        }];
      }));
      setCoachLoading(false);
    }

    void loadAssignedCoaches();
    return () => { cancelled = true; };
  }, [session?.user.id]);

  const visiblePlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesSport = selectedSport === 'All' || plan.sport === selectedSport;
      const matchesSearch = !query ||
        `${plan.title} ${plan.sport} ${plan.coach} ${plan.summary} ${plan.level}`.toLowerCase().includes(query);
      return matchesSport && matchesSearch;
    });
  }, [search, selectedSport]);

  const openPlan = (plan: TrainingPlan) => navigation.navigate('MarketplacePlan', { plan });

  const openCoachChat = async (coachId: string) => {
    if (!session?.user.id || openingCoachId) return;
    setOpeningCoachId(coachId);
    try {
      const { data: assignment, error: assignmentError } = await (supabase
        .from('coach_athletes') as any)
        .select('coach_id')
        .eq('coach_id', coachId)
        .eq('athlete_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment) {
        Alert.alert('Coach unavailable', 'This coach is no longer assigned to your account.');
        setAssignedCoaches((current) => current.filter((coach) => coach.id !== coachId));
        return;
      }

      const chatQuery = () => (supabase.from('chats') as any)
        .select('id,status')
        .eq('coach_id', coachId)
        .eq('athlete_id', session.user.id)
        .maybeSingle();
      let { data: chat, error: chatError } = await chatQuery();
      if (chatError) throw chatError;

      if (!chat) {
        const created = await (supabase.from('chats') as any)
          .insert({ coach_id: coachId, athlete_id: session.user.id })
          .select('id,status')
          .single();
        if (created.error?.code === '23505') {
          const existing = await chatQuery();
          chat = existing.data;
          chatError = existing.error;
        } else {
          chat = created.data;
          chatError = created.error;
        }
      }

      if (chatError) throw chatError;
      if (!chat) throw new Error('Could not open this conversation.');
      if (chat.status !== 'open') {
        Alert.alert('Conversation closed', 'This conversation is closed. Contact your coach to reopen it.');
        return;
      }
      navigation.navigate('CoachChat', { chatId: chat.id });
    } catch (error) {
      Alert.alert('Could not open chat', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setOpeningCoachId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to profile"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>COACH-BUILT PLANS</Text>
          <Text style={styles.title}>Marketplace</Text>
        </View>
      </View>

      <View style={styles.previewNote}>
        <Ionicons name="information-circle-outline" size={17} color="#80551C" />
        <Text style={styles.previewNoteText}>Sample listings. Live coach plans are coming soon.</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search plans, sports, coaches"
          placeholderTextColor="#89919D"
          returnKeyType="search"
          accessibilityLabel="Search training plans"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={19} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((filter) => {
          const active = selectedSport === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filter, active && styles.filterActive]}
              onPress={() => setSelectedSport(filter)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Training plans</Text>
        <Text style={styles.resultCount}>{visiblePlans.length} plans</Text>
      </View>

      {visiblePlans.length ? visiblePlans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={styles.planCard}
          onPress={() => openPlan(plan)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`Preview ${plan.title}, ${plan.price} dollars`}
        >
          <View style={[styles.planIcon, { backgroundColor: plan.accent }]}>
            <Ionicons name={plan.icon} size={23} color="#fff" />
          </View>
          <View style={styles.planMain}>
            <View style={styles.planTopline}>
              <Text style={styles.sportLabel}>{plan.sport.toUpperCase()}</Text>
              <Text style={styles.price}>${plan.price}</Text>
            </View>
            <Text style={styles.planTitle} numberOfLines={2}>{plan.title}</Text>
            <Text style={styles.planSummary} numberOfLines={2}>{plan.summary}</Text>
            <View style={styles.planMeta}>
              <Text style={styles.coachName}>{plan.coach}</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.metaText}>{plan.duration}</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.metaText}>{plan.level}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={26} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No plans found</Text>
          <Text style={styles.emptyBody}>Try another sport or search term.</Text>
        </View>
      )}

      <View style={styles.coachSection}>
        <View style={styles.coachSectionHeading}>
          <View style={styles.coachSectionIcon}>
            <Ionicons name="chatbubbles-outline" size={19} color="#315F4D" />
          </View>
          <View style={styles.coachSectionCopy}>
            <Text style={styles.eyebrow}>YOUR TRAINING TEAM</Text>
            <Text style={styles.coachSectionTitle}>Talk to your coach</Text>
          </View>
        </View>

        {coachLoading ? (
          <View style={styles.coachStatusRow}>
            <Text style={styles.coachStatusText}>Checking your coach assignment…</Text>
          </View>
        ) : coachError ? (
          <View style={styles.coachStatusRow}>
            <Ionicons name="alert-circle-outline" size={17} color="#A95441" />
            <Text style={styles.coachErrorText}>{coachError}</Text>
          </View>
        ) : assignedCoaches.length ? (
          assignedCoaches.map((coach) => (
            <TouchableOpacity
              key={coach.id}
              style={styles.coachContact}
              onPress={() => void openCoachChat(coach.id)}
              disabled={openingCoachId !== null}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Talk to ${coach.full_name || 'your coach'}`}
            >
              <View style={styles.coachAvatar}>
                {coach.avatar_url ? (
                  <Ionicons name="person" size={18} color="#315F4D" />
                ) : (
                  <Ionicons name="person-outline" size={18} color="#315F4D" />
                )}
              </View>
              <View style={styles.coachContactCopy}>
                <Text style={styles.coachContactName}>{coach.full_name || 'Your coach'}</Text>
                <Text style={styles.coachContactMeta} numberOfLines={1}>
                  {coach.specialties.length ? coach.specialties.join(' · ') : coach.bio || 'Active coach assignment'}
                </Text>
              </View>
              <Text style={styles.messageAction}>{openingCoachId === coach.id ? 'Opening…' : 'Message'}</Text>
              <Ionicons name="chevron-forward" size={16} color="#718078" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.coachEmpty}>
            <Text style={styles.coachEmptyTitle}>No active coach assigned</Text>
            <Text style={styles.coachEmptyText}>When a coach is assigned to your account, your private conversation will appear here.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 1 },
  previewNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF2D8', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, marginBottom: spacing.md },
  previewNoteText: { color: '#68471C', fontSize: 11, fontWeight: '700', flex: 1 },
  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, minWidth: 0, color: colors.text, fontSize: 13, paddingVertical: 0 },
  filters: { gap: 8, paddingVertical: spacing.md },
  filter: { minHeight: 34, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#E9EDF2' },
  filterActive: { backgroundColor: colors.navy },
  filterText: { color: '#505A68', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  resultsTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  resultCount: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, minHeight: 136 },
  planIcon: { width: 44, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 2, marginRight: spacing.sm },
  planMain: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  planTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sportLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  price: { color: colors.text, fontSize: 15, fontWeight: '900' },
  planTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 5 },
  planSummary: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  planMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  coachName: { color: colors.text, fontSize: 10, fontWeight: '800' },
  metaText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  metaDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#A8AFB9' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.sm },
  emptyBody: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  coachSection: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  coachSectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  coachSectionIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E5', borderRadius: radius.sm },
  coachSectionCopy: { flex: 1, gap: 3 },
  coachSectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  coachStatusRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 2 },
  coachStatusText: { color: colors.textMuted, fontSize: 12 },
  coachErrorText: { flex: 1, color: '#A95441', fontSize: 11 },
  coachContact: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  coachAvatar: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E5', borderRadius: 19 },
  coachContactCopy: { flex: 1, minWidth: 0, gap: 4 },
  coachContactName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  coachContactMeta: { color: colors.textMuted, fontSize: 10 },
  messageAction: { color: '#315F4D', fontSize: 11, fontWeight: '800' },
  coachEmpty: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  coachEmptyTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  coachEmptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
});