import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { Race, Workout } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { syncWorkoutReminders } from '@/lib/workoutReminders';

function duration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.round(seconds / 60)} min`;
}

function distanceLabel(meters: number | null | undefined, sport: string) {
  if (!meters) return null;
  if (sport === 'swim') return `${(meters).toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const SPORT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  swim: 'water-outline',
  bike: 'bicycle-outline',
  run: 'walk-outline',
  strength: 'barbell-outline',
  brick: 'flash-outline',
};

export default function HomeScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [upcoming, setUpcoming] = useState<Workout[]>([]);
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([]);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const weekAhead = dayjs().add(7, 'day').format('YYYY-MM-DD');
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
    const weekEnd = dayjs().endOf('week').format('YYYY-MM-DD');
    const monthAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

    const [
      { data: todayData },
      { data: upcomingData },
      { data: weekData },
      { data: historyData },
      { data: raceData },
    ] = await Promise.all([
      supabase
        .from('workouts')
        .select('*')
        .eq('scheduled_date', today)
        .order('id', { ascending: true }),
      supabase
        .from('workouts')
        .select('*')
        .gt('scheduled_date', today)
        .lte('scheduled_date', weekAhead)
        .order('scheduled_date', { ascending: true }),
      supabase
        .from('workouts')
        .select('*')
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd),
      supabase
        .from('workouts')
        .select('scheduled_date, status')
        .eq('status', 'completed')
        .gte('scheduled_date', monthAgo)
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: false }),
      supabase
        .from('races')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    setTodayWorkouts((todayData as Workout[]) ?? []);
    setUpcoming((upcomingData as Workout[]) ?? []);
    setWeekWorkouts((weekData as Workout[]) ?? []);
    setStreak(computeStreak((historyData as { scheduled_date: string }[]) ?? []));
    setNextRace((raceData as Race | null) ?? null);
  };

  useFocusEffect(
    useCallback(() => {
      load();
      void syncWorkoutReminders().catch(() => undefined);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openWorkout = (workoutId: string) => {
    navigation.navigate('WorkoutDetails', { workoutId });
  };

  // ----- weekly summary -----
  const weekStats = useMemo(() => {
    const completed = weekWorkouts.filter((w) => w.status === 'completed');
    const totalSeconds = completed.reduce(
      (sum, w) =>
        sum + (w.actual_duration_seconds ?? w.planned_duration_seconds ?? 0),
      0
    );
    const bySport = completed.reduce<Record<string, number>>((acc, w) => {
      acc[w.sport] = (acc[w.sport] ?? 0) + 1;
      return acc;
    }, {});
    return {
      completedCount: completed.length,
      totalCount: weekWorkouts.length,
      hours: Math.round((totalSeconds / 3600) * 10) / 10,
      bySport,
    };
  }, [weekWorkouts]);

  const weekProgress =
    weekStats.totalCount > 0
      ? weekStats.completedCount / weekStats.totalCount
      : 0;

  const raceName = nextRace?.name ?? profile?.goal_race;
  const raceDate = nextRace?.event_date ?? profile?.goal_date;
  const daysToRace = raceDate && dayjs(raceDate).isValid()
    ? dayjs(raceDate).startOf('day').diff(dayjs().startOf('day'), 'day')
    : null;

  const renderWorkout = (workout: Workout, showDate = false) => (
    <TouchableOpacity
      key={workout.id}
      activeOpacity={0.82}
      style={[styles.card, { borderLeftColor: sportColor(workout.sport) }]}
      onPress={() => openWorkout(workout.id)}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.sportPill,
            { backgroundColor: `${sportColor(workout.sport)}18` },
          ]}
        >
          <Ionicons
            name={SPORT_ICON[workout.sport] ?? 'fitness-outline'}
            size={12}
            color={sportColor(workout.sport)}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.cardSport, { color: sportColor(workout.sport) }]}>
            {workout.sport.toUpperCase()}
          </Text>
        </View>

        {workout.status === 'completed' ? (
          <View style={styles.completedPill}>
            <Ionicons name="checkmark" size={13} color={colors.success} />
            <Text style={styles.completedText}>Done</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>

      {showDate && (
        <Text style={styles.cardDate}>
          {dayjs(workout.scheduled_date).format('ddd, D MMM')}
        </Text>
      )}

      <Text style={styles.cardTitle}>{workout.title}</Text>

      <View style={styles.cardBottom}>
        <View style={styles.metaRow}>
          {duration(
            workout.status === 'completed'
              ? workout.actual_duration_seconds ?? workout.planned_duration_seconds
              : workout.planned_duration_seconds
          ) && (
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {duration(
                  workout.status === 'completed'
                    ? workout.actual_duration_seconds ?? workout.planned_duration_seconds
                    : workout.planned_duration_seconds
                )}
              </Text>
            </View>
          )}
          {distanceLabel((workout as any).planned_distance_meters, workout.sport) && (
            <View style={styles.meta}>
              <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {distanceLabel((workout as any).planned_distance_meters, workout.sport)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.viewText}>
          {workout.status === 'completed' ? 'View analysis' : 'View workout'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={20} color={colors.blue} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>LETSMOVE</Text>
          <Text style={styles.greeting}>
            Hey {profile?.full_name?.split(' ')[0] ?? 'athlete'} 👋
          </Text>
          <Text style={styles.date}>{dayjs().format('dddd, D MMMM')}</Text>
        </View>

        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={15} color="#F97316" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>

      {/* Weekly progress card */}
      <View style={styles.weekCard}>
        <View style={styles.weekCardTop}>
          <View>
            <Text style={styles.weekCardLabel}>This week</Text>
            <Text style={styles.weekCardValue}>
              {weekStats.completedCount}/{weekStats.totalCount} workouts
            </Text>
          </View>
          <View style={styles.weekCardRight}>
            <Text style={styles.weekCardHours}>{weekStats.hours}h</Text>
            <Text style={styles.weekCardHoursLabel}>trained</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(weekProgress, 1) * 100}%` },
            ]}
          />
        </View>

        {Object.keys(weekStats.bySport).length > 0 && (
          <View style={styles.sportBreakdown}>
            {Object.entries(weekStats.bySport).map(([sport, count]) => (
              <View key={sport} style={styles.sportChip}>
                <Ionicons
                  name={SPORT_ICON[sport] ?? 'fitness-outline'}
                  size={12}
                  color={sportColor(sport)}
                />
                <Text style={[styles.sportChipText, { color: sportColor(sport) }]}>
                  {count}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {daysToRace !== null && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.raceCard}
          onPress={() => navigation.navigate('Race')}
        >
          <View style={styles.raceIcon}>
            <Ionicons name="flag" size={18} color="#C2410C" />
          </View>
          <View style={styles.raceCopy}>
            <Text style={styles.raceTitle}>{raceName || 'Goal race'}</Text>
            <Text style={styles.raceSubtitle}>
              {daysToRace > 0
                ? `${daysToRace} days to race day`
                : daysToRace === 0
                  ? 'Race day is today'
                  : 'Race date has passed'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() =>
            navigation.navigate('WorkoutBuilder', { date: dayjs().format('YYYY-MM-DD') })
          }
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#EAF2FF' }]}>
            <Ionicons name="add" size={19} color={colors.blue} />
          </View>
          <Text style={styles.quickActionText}>Add workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Calendar')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FDF2E9' }]}>
            <Ionicons name="calendar-outline" size={18} color="#F97316" />
          </View>
          <Text style={styles.quickActionText}>Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Library')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#EAF8EF' }]}>
            <Ionicons name="library-outline" size={18} color={colors.success} />
          </View>
          <Text style={styles.quickActionText}>Workout library</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Race')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#F3EAFF' }]}>
            <Ionicons name="flag-outline" size={18} color="#8B5CF6" />
          </View>
          <Text style={styles.quickActionText}>Race day</Text>
        </TouchableOpacity>
      </View>

      {/* Today */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today</Text>
        <Text style={styles.sectionCount}>{todayWorkouts.length}</Text>
      </View>

      {todayWorkouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="fitness-outline" size={25} color={colors.blue} />
          </View>
          <Text style={styles.emptyTitle}>Rest day?</Text>
          <Text style={styles.emptyText}>No workouts are scheduled for today.</Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              navigation.navigate('WorkoutBuilder', { date: dayjs().format('YYYY-MM-DD') })
            }
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        todayWorkouts.map((w) => renderWorkout(w))
      )}

      {/* AI coach */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.aiCard}
        onPress={() => navigation.navigate('AICoachChat')}
      >
        <View style={styles.aiGlow} />
        <View style={styles.aiTopRow}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI COACH</Text>
          </View>
        </View>

        <Text style={styles.aiTitle}>Your AI Endurance Coach</Text>
        <Text style={styles.aiText}>
          Ask training questions, share a training file, or describe a workout to add to your calendar.
        </Text>

        <View style={styles.aiFeatureRow}>
          <View style={styles.aiFeature}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color="#DCEBFF" />
            <Text style={styles.aiFeatureText}>Create workouts</Text>
          </View>
          <View style={styles.aiFeature}>
            <Ionicons name="git-branch-outline" size={13} color="#DCEBFF" />
            <Text style={styles.aiFeatureText}>Review training files</Text>
          </View>
          <View style={styles.aiFeature}>
            <Ionicons name="trophy-outline" size={13} color="#DCEBFF" />
            <Text style={styles.aiFeatureText}>Endurance Q&amp;A</Text>
          </View>
        </View>

        <View style={styles.aiCta}>
          <Text style={styles.aiCtaText}>Open AI chat</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Next 7 days */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Next 7 days</Text>
      </View>

      {upcoming.length === 0 ? (
        <View style={styles.simpleEmpty}>
          <Text style={styles.emptyText}>
            Nothing planned yet. Build your week in the Calendar tab.
          </Text>
        </View>
      ) : (
        upcoming.map((w) => renderWorkout(w, true))
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function computeStreak(history: { scheduled_date: string }[]): number {
  if (!history.length) return 0;
  const dates = Array.from(new Set(history.map((h) => h.scheduled_date))).sort(
    (a, b) => (a < b ? 1 : -1)
  );
  let streak = 0;
  let cursor = dayjs();
  // allow today to be "not yet done" without breaking the streak
  if (dates[0] !== cursor.format('YYYY-MM-DD')) {
    cursor = cursor.subtract(1, 'day');
  }
  for (const d of dates) {
    if (d === cursor.format('YYYY-MM-DD')) {
      streak += 1;
      cursor = cursor.subtract(1, 'day');
    } else {
      break;
    }
  }
  return streak;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: { flex: 1 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  greeting: { fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 1 },
  date: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF1E6',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  streakText: { color: '#F97316', fontWeight: '900', fontSize: 13 },

  weekCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  weekCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  weekCardLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  weekCardValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  weekCardRight: { alignItems: 'flex-end' },
  weekCardHours: { color: colors.blue, fontSize: 18, fontWeight: '900' },
  weekCardHoursLabel: { color: colors.textMuted, fontSize: 11 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEF1F5',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  sportBreakdown: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sportChipText: { fontSize: 11, fontWeight: '800' },

  raceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: radius.md,
    backgroundColor: '#FFF7ED',
  },
  raceIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#FFEDD5',
  },
  raceCopy: { flex: 1 },
  raceTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  raceSubtitle: { color: '#9A3412', fontSize: 12, marginTop: 2 },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quickAction: { alignItems: 'center', flex: 1 },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionCount: {
    marginLeft: 7,
    minWidth: 22,
    textAlign: 'center',
    color: colors.blue,
    backgroundColor: '#EAF2FF',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '900',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  cardSport: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EAF8EF',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  completedText: { color: colors.success, fontSize: 10, fontWeight: '900' },
  cardDate: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 8 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  metaRow: { flexDirection: 'row', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 12 },
  viewText: { color: colors.blue, fontSize: 12, fontWeight: '800' },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 5,
  },
  addButtonText: { color: '#fff', fontWeight: '800' },
  simpleEmpty: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  // AI card
  aiCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  aiGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59,130,246,0.35)',
  },
  aiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  aiBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  aiTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: spacing.sm },
  aiText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  aiFeatureRow: { marginTop: spacing.sm, gap: 6 },
  aiFeature: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiFeatureText: { color: '#DCEBFF', fontSize: 12, fontWeight: '600' },
  aiCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.blue,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  aiCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
