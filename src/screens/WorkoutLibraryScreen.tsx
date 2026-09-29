import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { Sport, Workout } from '@/types/database';

const FILTERS: Array<'all' | Sport> = ['all', 'swim', 'bike', 'run', 'gym', 'brick'];
const SPORT_ICON: Record<Sport, keyof typeof Ionicons.glyphMap> = {
  swim: 'water-outline',
  bike: 'bicycle-outline',
  run: 'walk-outline',
  gym: 'barbell-outline',
  brick: 'flash-outline',
  rest: 'moon-outline',
};

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export default function WorkoutLibraryScreen({ navigation }: any) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Sport>('all');

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .neq('status', 'skipped')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('scheduled_date', { ascending: false });

    if (!error) setWorkouts((data as Workout[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const filteredWorkouts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return workouts.filter((workout) => {
      const matchesSport = filter === 'all' || workout.sport === filter;
      const matchesQuery = !normalizedQuery ||
        `${workout.title} ${workout.sport} ${workout.completion_notes ?? ''}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesSport && matchesQuery;
    });
  }, [filter, query, workouts]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TRAINING LOG</Text>
          <Text style={styles.title}>Workout library</Text>
        </View>
        <Text style={styles.count}>{workouts.length}</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved workouts"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        style={styles.filtersScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((item) => {
          const selected = filter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filter, selected && styles.filterSelected]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {item === 'all' ? 'All' : item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredWorkouts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="file-tray-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {workouts.length ? 'No matching workouts' : 'No saved workouts yet'}
              </Text>
              <Text style={styles.emptyText}>
                {workouts.length
                  ? 'Try another search or sport filter.'
                  : 'Saved workouts, including AI workouts, will appear here.'}
              </Text>
            </View>
          ) : (
            filteredWorkouts.map((workout) => {
              const duration = formatDuration(
                workout.actual_duration_seconds ?? workout.planned_duration_seconds
              );
              return (
                <TouchableOpacity
                  key={workout.id}
                  style={[styles.workout, { borderLeftColor: sportColor(workout.sport) }]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('WorkoutDetails', { workoutId: workout.id })}
                >
                  <View style={styles.workoutTop}>
                    <View style={[styles.sport, { backgroundColor: `${sportColor(workout.sport)}18` }]}>
                      <Ionicons name={SPORT_ICON[workout.sport]} size={13} color={sportColor(workout.sport)} />
                      <Text style={[styles.sportText, { color: sportColor(workout.sport) }]}>
                        {workout.sport}
                      </Text>
                    </View>
                    <Text style={styles.date}>
                      {workout.completed_at
                        ? dayjs(workout.completed_at).format('D MMM YYYY')
                        : workout.scheduled_date
                          ? dayjs(workout.scheduled_date).format('D MMM YYYY')
                          : 'Not scheduled'}
                    </Text>
                  </View>
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  <View style={styles.metrics}>
                    {duration && (
                      <View style={styles.metric}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.metricText}>{duration}</Text>
                      </View>
                    )}
                    {workout.actual_distance_meters != null && (
                      <View style={styles.metric}>
                        <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.metricText}>
                          {workout.sport === 'swim'
                            ? `${Math.round(workout.actual_distance_meters)} m`
                            : `${(workout.actual_distance_meters / 1000).toFixed(1)} km`}
                        </Text>
                      </View>
                    )}
                    {workout.calories != null && (
                      <View style={styles.metric}>
                        <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.metricText}>{workout.calories} kcal</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 3 },
  count: { color: colors.blue, fontSize: 14, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 14 },
  filters: { gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filter: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSelected: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  filterTextSelected: { color: '#fff' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  workout: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  workoutTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sport: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  sportText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  date: { color: colors.textMuted, fontSize: 12 },
  workoutTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { color: colors.textMuted, fontSize: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: 5, textAlign: 'center' },
});