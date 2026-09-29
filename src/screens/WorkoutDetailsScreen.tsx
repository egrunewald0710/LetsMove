import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { Workout, WorkoutStep } from '@/types/database';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs ? `${mins}m ${secs}s` : `${mins} min`;
}

function formatDistance(meters: number | null | undefined) {
  if (meters == null) return '—';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 2)} km`;
}

function formatStep(step: WorkoutStep) {
  const parts: string[] = [];
  if (step.duration_seconds) parts.push(formatDuration(step.duration_seconds));
  if (step.distance_meters) parts.push(formatDistance(step.distance_meters));
  if (step.target_intensity) parts.push(step.target_intensity);
  return parts.join(' · ') || 'No target set';
}

export default function WorkoutDetailsScreen({ route, navigation }: any) {
  const workoutId: string = route.params?.workoutId;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actualDuration, setActualDuration] = useState('');
  const [actualDistance, setActualDistance] = useState('');
  const [averageHeartRate, setAverageHeartRate] = useState('');
  const [maxHeartRate, setMaxHeartRate] = useState('');
  const [calories, setCalories] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const loadWorkout = useCallback(async () => {
    if (!workoutId) return;

    setLoading(true);

    const [workoutResult, stepsResult] = (await Promise.all([
      (supabase.from('workouts') as any).select('*').eq('id', workoutId).single(),
      (supabase.from('workout_steps') as any)
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true }),
    ])) as any[];

    if (workoutResult.error || !workoutResult.data) {
      console.error(workoutResult.error);
      Alert.alert('Could not load workout', 'Please try again.');
      navigation.goBack();
      return;
    }

    setWorkout(workoutResult.data as Workout);
    setSteps((stepsResult.data as WorkoutStep[]) ?? []);

    const w = workoutResult.data as Workout;
    setActualDuration(
      w.actual_duration_seconds != null
        ? String(Math.round(w.actual_duration_seconds / 60))
        : ''
    );
    setActualDistance(
      w.actual_distance_meters != null
        ? String(w.actual_distance_meters / 1000)
        : ''
    );
    setAverageHeartRate(w.average_heart_rate?.toString() ?? '');
    setMaxHeartRate(w.max_heart_rate?.toString() ?? '');
    setCalories(w.calories?.toString() ?? '');
    setCompletionNotes(w.completion_notes ?? '');

    setLoading(false);
  }, [workoutId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [loadWorkout])
  );

  const completeWorkout = async () => {
    if (!workout) return;

    const durationMinutes = Number(actualDuration);
    if (!actualDuration || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      Alert.alert('Duration required', 'Enter the actual workout duration in minutes.');
      return;
    }

    setSaving(true);

    const payload = {
      status: 'completed' as const,
      actual_duration_seconds: Math.round(durationMinutes * 60),
      actual_distance_meters:
        actualDistance && Number.isFinite(Number(actualDistance))
          ? Math.round(Number(actualDistance) * 1000)
          : null,
      average_heart_rate:
        averageHeartRate && Number.isFinite(Number(averageHeartRate))
          ? Math.round(Number(averageHeartRate))
          : null,
      max_heart_rate:
        maxHeartRate && Number.isFinite(Number(maxHeartRate))
          ? Math.round(Number(maxHeartRate))
          : null,
      calories:
        calories && Number.isFinite(Number(calories))
          ? Math.round(Number(calories))
          : null,
      completion_notes: completionNotes.trim() || null,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase.from('workouts') as any)
      .update(payload)
      .eq('id', workout.id)
      .select('*')
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      Alert.alert(
        'Could not save workout',
        `${error.message}\n\nIf these fields were just added to Supabase, refresh the API schema or restart the app.`
      );
      return;
    }

    setWorkout(data as Workout);
    setShowCompleteForm(false);

    Alert.alert('Workout completed', 'Your results have been saved.');
  };

  const scheduleWorkout = async (scheduledDate: string) => {
    if (!workout) return;
    setSaving(true);
    const { data, error } = await (supabase.from('workouts') as any)
      .update({ scheduled_date: scheduledDate, status: 'planned' })
      .eq('id', workout.id)
      .select('*')
      .single();
    setSaving(false);

    if (error) {
      Alert.alert('Could not schedule workout', error.message);
      return;
    }

    setWorkout(data as Workout);
    setShowSchedulePicker(false);
    Alert.alert('Added to calendar', 'The workout is now scheduled.');
  };

  const analysis = useMemo(() => {
    if (!workout || workout.status !== 'completed') return null;

    const plannedDuration = workout.planned_duration_seconds;
    const actualDuration = workout.actual_duration_seconds;
    const plannedDistance = workout.planned_distance_meters;
    const actualDistance = workout.actual_distance_meters;

    const durationPercent =
      plannedDuration && actualDuration
        ? Math.round((actualDuration / plannedDuration) * 100)
        : null;

    const distancePercent =
      plannedDistance && actualDistance
        ? Math.round((actualDistance / plannedDistance) * 100)
        : null;

    return {
      durationDifference:
        plannedDuration != null && actualDuration != null
          ? actualDuration - plannedDuration
          : null,
      distanceDifference:
        plannedDistance != null && actualDistance != null
          ? actualDistance - plannedDistance
          : null,
      durationPercent,
      distancePercent,
    };
  }, [workout]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  if (!workout) return null;

  const completed = workout.status === 'completed';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Workout Details</Text>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              navigation.navigate('WorkoutBuilder', { workoutId: workout.id })
            }
          >
            <Ionicons name="create-outline" size={21} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.hero,
            { borderLeftColor: sportColor(workout.sport) },
          ]}
        >
          <View style={styles.heroTop}>
            <View
              style={[
                styles.sportBadge,
                { backgroundColor: `${sportColor(workout.sport)}18` },
              ]}
            >
              <View
                style={[
                  styles.sportDot,
                  { backgroundColor: sportColor(workout.sport) },
                ]}
              />
              <Text
                style={[
                  styles.sportText,
                  { color: sportColor(workout.sport) },
                ]}
              >
                {workout.sport.toUpperCase()}
              </Text>
            </View>

            {completed && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{workout.title}</Text>
          <Text style={styles.date}>
            {workout.scheduled_date
              ? new Date(`${workout.scheduled_date}T12:00:00`).toLocaleDateString(
                  undefined,
                  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                )
              : 'Saved workout · not scheduled'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout overview</Text>

          <View style={styles.card}>
            <Text style={styles.description}>
              {workout.notes || 'No additional instructions were added for this workout.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Planned workout</Text>

          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={20} color={colors.blue} />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>
                {formatDuration(workout.planned_duration_seconds)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <Ionicons name="navigate-outline" size={20} color={colors.blue} />
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {formatDistance(workout.planned_distance_meters)}
              </Text>
            </View>
          </View>
        </View>

        {steps.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionTitle}>Workout steps</Text>
              <Text style={styles.stepCount}>{steps.length} steps</Text>
            </View>

            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>

                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {step.label || `Step ${index + 1}`}
                  </Text>

                  <Text style={styles.stepMeta}>
                    {formatStep(step)}
                    {step.repeat_count > 1
                      ? ` · Repeat ×${step.repeat_count}`
                      : ''}
                  </Text>

                  {!!step.notes && (
                    <Text style={styles.stepNotes}>{step.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {!completed && !workout.scheduled_date && !showCompleteForm && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.scheduleButton}
            onPress={() => setShowSchedulePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.blue} />
            <Text style={styles.scheduleButtonText}>Add to calendar</Text>
          </TouchableOpacity>
        )}

        {!completed && !showCompleteForm && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => setShowCompleteForm(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.primaryButtonText}>Complete Workout</Text>
          </TouchableOpacity>
        )}

        {!completed && showCompleteForm && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formTitle}>Record your workout</Text>
                  <Text style={styles.formSubtitle}>
                    Add the results after you finish training.
                  </Text>
                </View>

                <Ionicons name="analytics-outline" size={26} color={colors.blue} />
              </View>

              <Field
                label="Actual duration"
                suffix="min"
                value={actualDuration}
                onChangeText={setActualDuration}
                placeholder="60"
                keyboardType="numeric"
              />

              <Field
                label="Actual distance"
                suffix="km"
                value={actualDistance}
                onChangeText={setActualDistance}
                placeholder="10.5"
                keyboardType="decimal-pad"
              />

              <View style={styles.twoColumns}>
                <View style={styles.column}>
                  <Field
                    label="Average HR"
                    suffix="bpm"
                    value={averageHeartRate}
                    onChangeText={setAverageHeartRate}
                    placeholder="145"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.column}>
                  <Field
                    label="Max HR"
                    suffix="bpm"
                    value={maxHeartRate}
                    onChangeText={setMaxHeartRate}
                    placeholder="165"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Field
                label="Calories"
                suffix="kcal"
                value={calories}
                onChangeText={setCalories}
                placeholder="600"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>How did it feel?</Text>
              <TextInput
                style={styles.notesInput}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Add a short note about the session..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={completeWorkout}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Save Results</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCompleteForm(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {completed && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actual workout</Text>

              <View style={styles.statsCard}>
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={20} color={colors.success} />
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>
                    {formatDuration(workout.actual_duration_seconds)}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.stat}>
                  <Ionicons name="navigate-outline" size={20} color={colors.success} />
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>
                    {formatDistance(workout.actual_distance_meters)}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <Metric
                  icon="heart-outline"
                  label="Avg HR"
                  value={
                    workout.average_heart_rate
                      ? `${workout.average_heart_rate} bpm`
                      : '—'
                  }
                />
                <Metric
                  icon="heart-circle-outline"
                  label="Max HR"
                  value={
                    workout.max_heart_rate
                      ? `${workout.max_heart_rate} bpm`
                      : '—'
                  }
                />
                <Metric
                  icon="flame-outline"
                  label="Calories"
                  value={
                    workout.calories ? `${workout.calories} kcal` : '—'
                  }
                />
              </View>
            </View>

            {analysis && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Workout analysis</Text>

                <View style={styles.analysisCard}>
                  <View style={styles.analysisIcon}>
                    <Ionicons name="analytics" size={23} color={colors.blue} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.analysisTitle}>
                      Planned vs actual
                    </Text>
                    <Text style={styles.analysisText}>
                      {analysis.durationPercent != null
                        ? `You completed ${analysis.durationPercent}% of the planned duration.`
                        : 'Your completed workout has been recorded.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.comparisonCard}>
                  {analysis.durationDifference != null && (
                    <ComparisonRow
                      label="Duration"
                      value={
                        analysis.durationDifference === 0
                          ? 'On target'
                          : analysis.durationDifference > 0
                            ? `${formatDuration(analysis.durationDifference)} longer`
                            : `${formatDuration(Math.abs(analysis.durationDifference))} shorter`
                      }
                      positive={analysis.durationDifference >= 0}
                    />
                  )}

                  {analysis.distanceDifference != null && (
                    <ComparisonRow
                      label="Distance"
                      value={
                        analysis.distanceDifference === 0
                          ? 'On target'
                          : analysis.distanceDifference > 0
                            ? `${formatDistance(analysis.distanceDifference)} more`
                            : `${formatDistance(Math.abs(analysis.distanceDifference))} less`
                      }
                      positive={analysis.distanceDifference >= 0}
                    />
                  )}
                </View>
              </View>
            )}

            {!!workout.completion_notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your notes</Text>
                <View style={styles.card}>
                  <Text style={styles.description}>
                    {workout.completion_notes}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <Modal
        visible={showSchedulePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSchedulePicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.scheduleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a date</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowSchedulePicker(false)}
                accessibilityLabel="Close date picker"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={dayjs().format('YYYY-MM-DD')}
              minDate={dayjs().format('YYYY-MM-DD')}
              onDayPress={(date) => void scheduleWorkout(date.dateString)}
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                todayTextColor: colors.blue,
                arrowColor: colors.blue,
                textSectionTitleColor: colors.textMuted,
                dayTextColor: colors.text,
                monthTextColor: colors.text,
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  suffix,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ComparisonRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <Text
        style={[
          styles.comparisonValue,
          { color: positive ? colors.success : colors.textMuted },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: { marginTop: spacing.sm, color: colors.textMuted },
  topBar: {
    height: 64,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  hero: {
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sportDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  sportText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 3,
  },
  completedText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  title: {
    marginTop: spacing.md,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    color: colors.text,
  },
  date: { marginTop: 7, fontSize: 14, color: colors.textMuted },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCount: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 2 },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: { color: colors.blue, fontWeight: '900' },
  stepContent: { flex: 1 },
  stepTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  stepMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  stepNotes: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  primaryButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  scheduleButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scheduleButtonText: { color: colors.blue, fontSize: 15, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scheduleModal: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  formSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  field: { marginTop: spacing.md },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  inputWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15 },
  suffix: { paddingRight: 13, color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  column: { flex: 1 },
  notesInput: {
    minHeight: 100,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    color: colors.text,
    fontSize: 14,
  },
  cancelButton: { alignItems: 'center', paddingVertical: 14 },
  cancelButtonText: { color: colors.textMuted, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  metric: {
    flex: 1,
    minHeight: 82,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  metricLabel: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  analysisCard: {
    backgroundColor: '#EEF5FF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D6E6FF',
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  analysisIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  analysisText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  comparisonCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonLabel: { color: colors.textMuted, fontSize: 13 },
  comparisonValue: { fontSize: 13, fontWeight: '900' },
});
