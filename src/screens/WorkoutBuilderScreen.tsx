import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { Sport, Workout, WorkoutStep } from '@/types/database';

const SPORTS: Sport[] = ['swim', 'bike', 'run', 'gym', 'brick', 'rest'];

const SPORT_ICON: Record<Sport, keyof typeof Ionicons.glyphMap> = {
  swim: 'water-outline',
  bike: 'bicycle-outline',
  run: 'walk-outline',
  gym: 'barbell-outline',
  brick: 'flash-outline',
  rest: 'moon-outline',
};

const STEP_PRESETS = ['Warm-up', 'Main set', 'Recovery', 'Cool-down'];

export default function WorkoutBuilderScreen({ route, navigation }: any) {
  const { session } = useAuth();
  const workoutId: string | undefined = route.params?.workoutId;
  const initialDate: string = route.params?.date ?? dayjs().format('YYYY-MM-DD');

  const [sport, setSport] = useState<Sport>('run');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(!!workoutId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workoutId) loadWorkout(workoutId);
  }, [workoutId]);

  const loadWorkout = async (id: string) => {
    setLoading(true);
    const { data: w } = (await supabase.from('workouts').select('*').eq('id', id).single()) as {
      data: Workout | null;
    };
    if (w) {
      setSport(w.sport);
      setTitle(w.title);
      setDate(w.scheduled_date ?? dayjs().format('YYYY-MM-DD'));
      const durationSeconds = w.planned_duration_seconds ?? 0;
      setDurationHours(String(Math.floor(durationSeconds / 3600)));
      setDurationMinutes(String(Math.floor((durationSeconds % 3600) / 60)));
      setNotes(w.notes ?? '');
    }
    setLoading(false);
  };
  const totalPlannedSeconds =
    (Number(durationHours) || 0) * 3600 + (Number(durationMinutes) || 0) * 60;

  const handleSave = async () => {
    if (!session?.user) return;
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your workout a title.');
      return;
    }
    setSaving(true);
    try {
      let id = workoutId;
      const payload = {
        user_id: session.user.id,
        sport,
        title: title.trim(),
        scheduled_date: date,
        notes: notes || null,
        planned_duration_seconds: totalPlannedSeconds || null,
      };

      if (id) {
        const { error } = await supabase.from('workouts').update(payload as never).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workouts')
          .insert(payload as never)
          .select()
          .single();
        if (error) throw error;
        id = (data as Workout).id;
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save workout', e.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workoutId) return;
    Alert.alert('Delete workout', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('workouts').delete().eq('id', workoutId);
          navigation.goBack();
        },
      },
    ]);
  };

  const showAiComingSoon = () => {
    Alert.alert(
      'AI workout builder — coming soon',
      'Soon you\'ll be able to describe a workout in plain language ("90 min bike with 4x8min threshold") and have it built here automatically.'
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.blue} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>{workoutId ? 'Edit workout' : 'New workout'}</Text>

      {/* AI builder teaser */}
      <TouchableOpacity activeOpacity={0.9} style={styles.aiCard} onPress={showAiComingSoon}>
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.aiTitleRow}>
            <Text style={styles.aiTitle}>Build this with AI</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>SOON</Text>
            </View>
          </View>
          <Text style={styles.aiText}>
            Describe the workout you want and let AI fill in the steps for you.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      </TouchableOpacity>

      {/* Sport */}
      <Text style={styles.label}>Sport</Text>
      <View style={styles.sportRow}>
        {SPORTS.map((s) => {
          const active = sport === s;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.sportChip,
                { borderColor: sportColor(s) },
                active && { backgroundColor: sportColor(s) },
              ]}
              onPress={() => setSport(s)}
            >
              <Ionicons
                name={SPORT_ICON[s]}
                size={13}
                color={active ? '#fff' : sportColor(s)}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.sportChipText, active && { color: '#fff' }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Basics card */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>TITLE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Threshold intervals"
          placeholderTextColor="#A7AEB8"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>DATE</Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A7AEB8"
            value={date}
            onChangeText={setDate}
          />
        </View>
      </View>

      <View style={styles.durationCard}>
        <View style={styles.durationHeader}>
          <View>
            <Text style={styles.durationTitle}>Total duration</Text>
            <Text style={styles.durationSubtitle}>Planned time for this workout</Text>
          </View>
          <Ionicons name="time-outline" size={21} color={colors.blue} />
        </View>
        <View style={styles.durationInputs}>
          <View style={styles.durationField}>
            <TextInput
              style={styles.durationInput}
              placeholder="0"
              placeholderTextColor="#A7AEB8"
              keyboardType="number-pad"
              value={durationHours}
              onChangeText={(value) => setDurationHours(value.replace(/\D/g, ''))}
              accessibilityLabel="Duration hours"
            />
            <Text style={styles.durationUnit}>hr</Text>
          </View>
          <View style={styles.durationField}>
            <TextInput
              style={styles.durationInput}
              placeholder="0"
              placeholderTextColor="#A7AEB8"
              keyboardType="number-pad"
              value={durationMinutes}
              onChangeText={(value) =>
                setDurationMinutes(String(Math.min(Number(value.replace(/\D/g, '')) || 0, 59)))
              }
              accessibilityLabel="Duration minutes"
            />
            <Text style={styles.durationUnit}>min</Text>
          </View>
        </View>
        {totalPlannedSeconds > 0 && (
          <Text style={styles.durationSummary}>
            Total: {Math.floor(totalPlannedSeconds / 3600)} hr{' '}
            {Math.floor((totalPlannedSeconds % 3600) / 60)} min
          </Text>
        )}
      </View>

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Coach notes, focus points..."
        placeholderTextColor="#A7AEB8"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Save workout</Text>
          </>
        )}
      </TouchableOpacity>

      {workoutId && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
          <Text style={styles.deleteButtonText}>Delete workout</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  screenTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: spacing.md },

  // AI teaser
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  aiIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  aiTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  aiBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  aiText: { color: '#CBD5E1', fontSize: 12, marginTop: 3, lineHeight: 16 },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  dateInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },

  durationCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  durationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  durationTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  durationSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  durationInputs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  durationField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  durationInput: { flex: 1, paddingVertical: 12, fontSize: 18, color: colors.text },
  durationUnit: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  durationSummary: { color: colors.blue, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },

  sportRow: { flexDirection: 'row', flexWrap: 'wrap' },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  sportChipText: { textTransform: 'capitalize', fontWeight: '700', color: colors.text, fontSize: 12 },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 15,
    marginTop: spacing.lg,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  deleteButtonText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
});
