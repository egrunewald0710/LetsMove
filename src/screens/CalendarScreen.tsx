import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { Workout } from '@/types/database';

const SPORT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  swim: 'water-outline',
  bike: 'bicycle-outline',
  run: 'walk-outline',
  strength: 'barbell-outline',
  brick: 'flash-outline',
};

function duration(seconds: number | null | undefined) {
  if (!seconds) return null;
  return `${Math.round(seconds / 60)} min`;
}

export default function CalendarScreen({ navigation }: any) {
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(today);
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([]);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMonth = async (dateStr: string) => {
    setLoading(true);

    const start = dayjs(dateStr).startOf('month').format('YYYY-MM-DD');
    const end = dayjs(dateStr).endOf('month').format('YYYY-MM-DD');

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error(error);
      setMonthWorkouts([]);
    } else {
      setMonthWorkouts((data as Workout[]) ?? []);
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMonth(visibleMonth);
    }, [visibleMonth])
  );

  const handleMonthChange = (date: DateData) => {
    const firstDay = dayjs(date.dateString).startOf('month').format('YYYY-MM-DD');
    setVisibleMonth(firstDay);
    loadMonth(date.dateString);
  };

  const goToday = () => {
    setSelectedDate(today);
    if (dayjs(today).format('YYYY-MM') !== dayjs(visibleMonth).format('YYYY-MM')) {
      setVisibleMonth(dayjs(today).startOf('month').format('YYYY-MM-DD'));
    }
  };

  const filteredMonthWorkouts = useMemo(
    () =>
      sportFilter
        ? monthWorkouts.filter((w) => w.sport === sportFilter)
        : monthWorkouts,
    [monthWorkouts, sportFilter]
  );

  const sportsInMonth = useMemo(
    () => Array.from(new Set(monthWorkouts.map((w) => w.sport))),
    [monthWorkouts]
  );

  // ----- month summary -----
  const monthStats = useMemo(() => {
    const completed = monthWorkouts.filter((w) => w.status === 'completed');
    const totalSeconds = completed.reduce(
      (sum, w) => sum + (w.planned_duration_seconds ?? 0),
      0
    );
    return {
      completedCount: completed.length,
      totalCount: monthWorkouts.length,
      hours: Math.round((totalSeconds / 3600) * 10) / 10,
    };
  }, [monthWorkouts]);

  const markedDates = filteredMonthWorkouts.reduce((acc: any, workout) => {
    if (!workout.scheduled_date) return acc;

    const dot = {
      key: workout.id,
      color: sportColor(workout.sport),
    };

    acc[workout.scheduled_date] = acc[workout.scheduled_date]
      ? {
          ...acc[workout.scheduled_date],
          dots: [...acc[workout.scheduled_date].dots, dot],
        }
      : { dots: [dot] };

    return acc;
  }, {});

  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: colors.blue,
    selectedTextColor: '#fff',
  };

  if (selectedDate === today && !markedDates[today]?.selected) {
    markedDates[today] = { ...(markedDates[today] ?? {}), marked: false };
  }

  const dayWorkouts = filteredMonthWorkouts.filter(
    (workout) => workout.scheduled_date === selectedDate
  );

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Training Calendar</Text>
          <Text style={styles.subtitle}>Plan and review your training</Text>
        </View>

        <TouchableOpacity style={styles.todayButton} onPress={goToday}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Month summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{monthStats.totalCount}</Text>
          <Text style={styles.summaryLabel}>this month</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {monthStats.completedCount}
          </Text>
          <Text style={styles.summaryLabel}>completed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.blue }]}>
            {monthStats.hours}h
          </Text>
          <Text style={styles.summaryLabel}>trained</Text>
        </View>
      </View>

      {/* Sport filter chips */}
      {sportsInMonth.length > 1 && (
        <FlatList
          horizontal
          data={sportsInMonth}
          keyExtractor={(s) => s}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}
          renderItem={({ item: sport }) => {
            const active = sportFilter === sport;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  active && {
                    backgroundColor: sportColor(sport),
                    borderColor: sportColor(sport),
                  },
                ]}
                onPress={() => setSportFilter(active ? null : sport)}
              >
                <Ionicons
                  name={SPORT_ICON[sport] ?? 'fitness-outline'}
                  size={12}
                  color={active ? '#fff' : sportColor(sport)}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#fff' : sportColor(sport) },
                  ]}
                >
                  {sport}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.calendarCard}>
        <Calendar
          current={visibleMonth}
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={(date: DateData) => setSelectedDate(date.dateString)}
          onMonthChange={handleMonthChange}
          theme={{
            backgroundColor: colors.card,
            calendarBackground: colors.card,
            textSectionTitleColor: colors.textMuted,
            dayTextColor: colors.text,
            textDisabledColor: '#C7CDD6',
            monthTextColor: colors.text,
            todayTextColor: colors.blue,
            selectedDayBackgroundColor: colors.blue,
            selectedDayTextColor: '#fff',
            arrowColor: colors.blue,
            textMonthFontWeight: '800',
            textDayFontWeight: '600',
            textDayHeaderFontWeight: '700',
            textMonthFontSize: 16,
            textDayFontSize: 14,
          }}
        />
      </View>

      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listHeaderText}>
            {dayjs(selectedDate).format('dddd, D MMMM')}
          </Text>
          <Text style={styles.listHeaderSub}>
            {dayWorkouts.length === 1 ? '1 workout' : `${dayWorkouts.length} workouts`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('WorkoutBuilder', { date: selectedDate })}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dayWorkouts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => loadMonth(visibleMonth)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          dayWorkouts.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={25} color={colors.blue} />
            </View>
            <Text style={styles.emptyTitle}>
              {dayjs(selectedDate).isSame(today, 'day')
                ? 'Nothing planned today'
                : dayjs(selectedDate).isBefore(today, 'day')
                ? 'No workout logged'
                : 'Nothing planned yet'}
            </Text>
            <Text style={styles.empty}>Tap + to add a workout for this day.</Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate('WorkoutBuilder', { date: selectedDate })}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Add workout</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.82}
            style={[styles.card, { borderLeftColor: sportColor(item.sport) }]}
            onPress={() => navigation.navigate('WorkoutDetails', { workoutId: item.id })}
          >
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.sportPill,
                  { backgroundColor: `${sportColor(item.sport)}18` },
                ]}
              >
                <Ionicons
                  name={SPORT_ICON[item.sport] ?? 'fitness-outline'}
                  size={12}
                  color={sportColor(item.sport)}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.cardSport, { color: sportColor(item.sport) }]}>
                  {item.sport.toUpperCase()}
                </Text>
              </View>

              {item.status === 'completed' ? (
                <View style={styles.completedPill}>
                  <Ionicons name="checkmark" size={13} color={colors.success} />
                  <Text style={styles.completedText}>Done</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </View>

            <Text style={styles.cardTitle}>{item.title}</Text>

            <View style={styles.cardFooter}>
              {duration(item.planned_duration_seconds) && (
                <View style={styles.cardMeta}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.cardHint}>
                    {duration(item.planned_duration_seconds)}
                  </Text>
                </View>
              )}
              <Text style={styles.cardHint}>
                {item.status === 'completed' ? 'Tap to view analysis' : 'Tap to view workout'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  todayButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  todayButtonText: { color: colors.blue, fontWeight: '800', fontSize: 12 },

  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: colors.border },

  filterRow: { marginBottom: spacing.sm, flexGrow: 0 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  filterChipText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },

  calendarCard: {
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listHeaderText: { fontSize: 17, fontWeight: '900', color: colors.text },
  listHeaderSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  emptyCard: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
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
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 19,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  emptyAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
  },
  cardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardHint: { color: colors.textMuted, fontSize: 12 },
});
