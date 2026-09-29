import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { Sport, Workout } from '@/types/database';

type Period = '30' | '90' | 'all';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' },
];

const SPORT_ICON: Record<Sport, keyof typeof Ionicons.glyphMap> = {
  swim: 'water-outline',
  bike: 'bicycle-outline',
  run: 'walk-outline',
  gym: 'barbell-outline',
  brick: 'flash-outline',
  rest: 'moon-outline',
};

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export default function AnalysisScreen({ navigation }: any) {
  const [period, setPeriod] = useState<Period>('30');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    let query = (supabase.from('workouts') as any)
      .select('*')
      .eq('status', 'completed');
    if (period !== 'all') {
      query = query.gte('scheduled_date', dayjs().subtract(Number(period), 'day').format('YYYY-MM-DD'));
    }
    const { data, error: loadError } = await query
      .order('scheduled_date', { ascending: false })
      .limit(100);
    if (loadError) setError(loadError.message);
    else {
      setWorkouts((data as Workout[]) ?? []);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const stats = useMemo(() => {
    const bySport = workouts.reduce<Record<string, { count: number; seconds: number }>>((result, workout) => {
      const entry = result[workout.sport] ?? { count: 0, seconds: 0 };
      entry.count += 1;
      entry.seconds += workout.actual_duration_seconds ?? workout.planned_duration_seconds ?? 0;
      result[workout.sport] = entry;
      return result;
    }, {});
    return {
      count: workouts.length,
      seconds: workouts.reduce(
        (sum, workout) => sum + (workout.actual_duration_seconds ?? workout.planned_duration_seconds ?? 0),
        0
      ),
      distance: workouts.reduce((sum, workout) => sum + (workout.actual_distance_meters ?? 0), 0),
      bySport,
    };
  }, [workouts]);

  const sortedSports = Object.entries(stats.bySport).sort((left, right) => right[1].seconds - left[1].seconds);
  const maxSportSeconds = Math.max(1, ...sortedSports.map(([, values]) => values.seconds));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.blue}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TRAINING LOG</Text>
        <Text style={styles.title}>Analysis</Text>
        <Text style={styles.subtitle}>Completed sessions from your workout history</Text>
      </View>

      <View style={styles.periods}>
        {PERIODS.map((item) => {
          const selected = period === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.period, selected && styles.periodSelected]}
              onPress={() => setPeriod(item.value)}
            >
              <Text style={[styles.periodText, selected && styles.periodTextSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /></View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{(stats.seconds / 3600).toFixed(1)}h</Text>
              <Text style={styles.statLabel}>training time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {stats.distance >= 1000 ? `${(stats.distance / 1000).toFixed(0)} km` : `${Math.round(stats.distance)} m`}
              </Text>
              <Text style={styles.statLabel}>recorded distance</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time by sport</Text>
            {sortedSports.length === 0 ? (
              <Text style={styles.emptyText}>Complete workouts to see your training breakdown.</Text>
            ) : sortedSports.map(([sport, values]) => (
              <View key={sport} style={styles.sportRow}>
                <View style={styles.sportLabel}>
                  <Ionicons name={SPORT_ICON[sport as Sport]} size={16} color={sportColor(sport)} />
                  <Text style={styles.sportName}>{sport}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${Math.max(4, (values.seconds / maxSportSeconds) * 100)}%`, backgroundColor: sportColor(sport) },
                    ]}
                  />
                </View>
                <Text style={styles.sportValue}>{durationLabel(values.seconds)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent sessions</Text>
              <Text style={styles.sessionCount}>{workouts.length}</Text>
            </View>
            {workouts.length === 0 ? (
              <Text style={styles.emptyText}>No completed sessions in this period.</Text>
            ) : workouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.session}
                activeOpacity={0.78}
                onPress={() => navigation.navigate('WorkoutDetails', { workoutId: workout.id })}
              >
                <View style={[styles.sessionIcon, { backgroundColor: `${sportColor(workout.sport)}18` }]}>
                  <Ionicons name={SPORT_ICON[workout.sport]} size={16} color={sportColor(workout.sport)} />
                </View>
                <View style={styles.sessionCopy}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>{workout.title}</Text>
                  <Text style={styles.sessionDate}>
                    {dayjs(workout.scheduled_date).format('ddd, D MMM')} · {workout.sport}
                  </Text>
                </View>
                <Text style={styles.sessionDuration}>
                  {durationLabel(workout.actual_duration_seconds ?? workout.planned_duration_seconds ?? 0)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.scopeNote}>Based on workout results entered in LetsMove. Device and Garmin activity sync is not connected.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.md },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  periods: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: radius.md, backgroundColor: '#E9EDF3', marginBottom: spacing.md },
  period: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  periodSelected: { backgroundColor: colors.card },
  periodText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  periodTextSelected: { color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginBottom: spacing.md },
  loading: { padding: spacing.xl, alignItems: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  section: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: spacing.sm },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  sportLabel: { width: 75, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sportName: { color: colors.text, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  sportValue: { width: 52, color: colors.textMuted, fontSize: 10, textAlign: 'right' },
  sessionCount: { color: colors.blue, fontSize: 11, fontWeight: '800', marginBottom: spacing.sm },
  session: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  sessionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sessionCopy: { flex: 1 },
  sessionTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  sessionDate: { color: colors.textMuted, fontSize: 10, marginTop: 3, textTransform: 'capitalize' },
  sessionDuration: { color: colors.text, fontSize: 11, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  scopeNote: { color: colors.textMuted, fontSize: 10, lineHeight: 15, paddingHorizontal: 3 },
});