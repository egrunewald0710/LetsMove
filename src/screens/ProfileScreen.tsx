import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme/theme';
import { getWorkoutRemindersEnabled, setWorkoutRemindersEnabled } from '@/lib/workoutReminders';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  style,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  style?: any;
}) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon} size={13} color={colors.textMuted} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#A7AEB8"
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [ftp, setFtp] = useState(profile?.ftp_watts?.toString() ?? '');
  const [thresholdPace, setThresholdPace] = useState(profile?.threshold_pace_run ?? '');
  const [cssPace, setCssPace] = useState(profile?.css_pace_swim ?? '');
  const [maxHr, setMaxHr] = useState(profile?.max_hr?.toString() ?? '');
  const [restingHr, setRestingHr] = useState(profile?.resting_hr?.toString() ?? '');
  const [goalRace, setGoalRace] = useState(profile?.goal_race ?? '');
  const [goalDate, setGoalDate] = useState(profile?.goal_date ?? '');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const syncFormWithProfile = () => {
    setFullName(profile?.full_name ?? '');
    setFtp(profile?.ftp_watts?.toString() ?? '');
    setThresholdPace(profile?.threshold_pace_run ?? '');
    setCssPace(profile?.css_pace_swim ?? '');
    setMaxHr(profile?.max_hr?.toString() ?? '');
    setRestingHr(profile?.resting_hr?.toString() ?? '');
    setGoalRace(profile?.goal_race ?? '');
    setGoalDate(profile?.goal_date ?? '');
  };

  useEffect(() => {
    syncFormWithProfile();
  }, [profile]);

  useEffect(() => {
    getWorkoutRemindersEnabled().then(setRemindersEnabled).catch(() => undefined);
  }, []);

  const toggleWorkoutReminders = async (enabled: boolean) => {
    try {
      const updated = await setWorkoutRemindersEnabled(enabled);
      if (!updated) {
        Alert.alert(
          'Notifications unavailable',
          'Allow notifications in your device settings to receive workout reminders.'
        );
        return;
      }
      setRemindersEnabled(enabled);
    } catch {
      Alert.alert('Could not update reminders', 'Please try again.');
    }
  };

  const zonesFilled = [ftp, thresholdPace, cssPace, maxHr, restingHr].filter(Boolean).length;

  const daysToRace = useMemo(() => {
    if (!goalDate || !dayjs(goalDate).isValid()) return null;
    const diff = dayjs(goalDate).startOf('day').diff(dayjs().startOf('day'), 'day');
    return diff;
  }, [goalDate]);

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    const payload = {
      full_name: fullName,
      ftp_watts: ftp ? parseInt(ftp, 10) : null,
      threshold_pace_run: thresholdPace || null,
      css_pace_swim: cssPace || null,
      max_hr: maxHr ? parseInt(maxHr, 10) : null,
      resting_hr: restingHr ? parseInt(restingHr, 10) : null,
      goal_race: goalRace || null,
      goal_date: goalDate || null,
    };
    const { error } = await supabase
      .from('profiles')
      .update(payload as never)
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error saving profile', error.message);
    } else {
      await refreshProfile();
      setIsEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const openEditMode = () => {
    syncFormWithProfile();
    setIsEditing(true);
  };

  const cancelEdit = () => {
    syncFormWithProfile();
    setIsEditing(false);
  };

  const renderReadOnlyProfile = () => (
    <>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(fullName || 'Athlete')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName || 'Your name'}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
        </View>
      </View>

      <View style={styles.summaryHeader}>
        <Ionicons name="person-circle-outline" size={18} color={colors.blue} />
        <Text style={styles.summaryHeaderText}>Profile overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Goal race</Text>
          <Text style={styles.metricValue}>{goalRace || 'Not set'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Race date</Text>
          <Text style={styles.metricValue}>{goalDate || 'Not set'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Bike FTP</Text>
          <Text style={styles.metricValue}>{ftp ? `${ftp} W` : 'Not set'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Run threshold</Text>
          <Text style={styles.metricValue}>{thresholdPace || 'Not set'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Swim CSS</Text>
          <Text style={styles.metricValue}>{cssPace || 'Not set'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Max HR</Text>
          <Text style={styles.metricValue}>{maxHr ? `${maxHr} bpm` : 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Recovery</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Resting HR</Text>
          <Text style={styles.infoValue}>{restingHr ? `${restingHr} bpm` : 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.reminderCard}>
        <View style={styles.reminderIcon}>
          <Ionicons name="notifications-outline" size={18} color={colors.blue} />
        </View>
        <View style={styles.reminderCopy}>
          <Text style={styles.reminderTitle}>Workout reminders</Text>
          <Text style={styles.reminderSubtitle}>8:00 AM on planned workout days</Text>
        </View>
        <Switch
          value={remindersEnabled}
          onValueChange={(value) => void toggleWorkoutReminders(value)}
          trackColor={{ false: colors.border, true: '#9BC2F7' }}
          thumbColor={remindersEnabled ? colors.blue : '#F5F6F8'}
          accessibilityLabel="Workout reminders"
        />
      </View>

      {daysToRace !== null && (
        <View style={styles.countdown}>
          <Ionicons
            name="hourglass-outline"
            size={14}
            color={daysToRace >= 0 ? colors.blue : colors.textMuted}
          />
          <Text style={styles.countdownText}>
            {daysToRace > 0
              ? `${daysToRace} days to go`
              : daysToRace === 0
              ? 'Race day is today 🎉'
              : 'Race date has passed'}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={openEditMode}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Edit profile</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEditProfile = () => (
    <>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(fullName || 'Athlete')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName || 'Your name'}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Field
          label="FULL NAME"
          icon="person-outline"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
        />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Ionicons name="flag-outline" size={15} color={colors.text} />
        <Text style={styles.sectionTitle}>Goal race</Text>
      </View>

      <View style={styles.card}>
        <Field
          label="RACE"
          icon="trophy-outline"
          value={goalRace}
          onChangeText={setGoalRace}
          placeholder="e.g. Ironman 70.3 Cape Town"
        />
        <Field
          label="RACE DATE"
          icon="calendar-outline"
          value={goalDate}
          onChangeText={setGoalDate}
          placeholder="YYYY-MM-DD"
          style={{ marginBottom: 0 }}
        />

        {daysToRace !== null && (
          <View style={styles.countdown}>
            <Ionicons
              name="hourglass-outline"
              size={14}
              color={daysToRace >= 0 ? colors.blue : colors.textMuted}
            />
            <Text style={styles.countdownText}>
              {daysToRace > 0
                ? `${daysToRace} days to go`
                : daysToRace === 0
                ? 'Race day is today 🎉'
                : 'Race date has passed'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Ionicons name="speedometer-outline" size={15} color={colors.text} />
        <Text style={styles.sectionTitle}>Training zones</Text>
        <View style={styles.zonesBadge}>
          <Text style={styles.zonesBadgeText}>{zonesFilled}/5 set</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Field
            label="BIKE FTP"
            icon="bicycle-outline"
            value={ftp}
            onChangeText={setFtp}
            placeholder="Watts"
            keyboardType="number-pad"
            style={styles.half}
          />
          <Field
            label="RUN THRESHOLD"
            icon="walk-outline"
            value={thresholdPace}
            onChangeText={setThresholdPace}
            placeholder="min/km"
            style={styles.half}
          />
        </View>
        <View style={styles.row}>
          <Field
            label="SWIM CSS"
            icon="water-outline"
            value={cssPace}
            onChangeText={setCssPace}
            placeholder="min/100m"
            style={styles.half}
          />
          <Field
            label="MAX HR"
            icon="pulse-outline"
            value={maxHr}
            onChangeText={setMaxHr}
            placeholder="bpm"
            keyboardType="number-pad"
            style={styles.half}
          />
        </View>
        <Field
          label="RESTING HR"
          icon="heart-outline"
          value={restingHr}
          onChangeText={setRestingHr}
          placeholder="bpm"
          keyboardType="number-pad"
          style={{ marginBottom: 0 }}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={cancelEdit}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {isEditing ? renderEditProfile() : renderReadOnlyProfile()}

      {!isEditing && (
        <TouchableOpacity style={styles.signOutButton} onPress={confirmSignOut}>
          <Ionicons name="log-out-outline" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  name: { fontSize: 20, fontWeight: '900', color: colors.text },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryHeaderText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    width: '48%',
    minHeight: 92,
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '900',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  infoValue: { fontSize: 12, color: colors.text, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: spacing.sm },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reminderIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  reminderSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  zonesBadge: {
    marginLeft: 'auto',
    backgroundColor: '#EAF2FF',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zonesBadgeText: { color: colors.blue, fontSize: 11, fontWeight: '800' },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  field: { marginBottom: spacing.sm },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
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
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },

  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countdownText: { color: colors.text, fontSize: 12, fontWeight: '700' },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: '800',
  },
  saveButtonDisabled: { opacity: 0.7 },

  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
