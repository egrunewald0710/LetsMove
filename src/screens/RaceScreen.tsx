import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme/theme';

type Race = {
  id: string;
  user_id: string;
  name: string;
  event_date: string;
  distance: string | null;
  location: string | null;
};

export default function RaceScreen() {
  const { session } = useAuth();
  const [races, setRaces] = useState<Race[]>([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [distance, setDistance] = useState('');
  const [location, setLocation] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRaces = async () => {
    setLoading(true);
    const { data, error: loadError } = await (supabase.from('races') as any)
      .select('*')
      .gte('event_date', dayjs().format('YYYY-MM-DD'))
      .order('event_date', { ascending: true });
    if (loadError) setError(loadError.message);
    else {
      setRaces((data as Race[]) ?? []);
      setError(null);
    }
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      void loadRaces();
    }, [])
  );

  const addRace = async () => {
    if (!session?.user.id) return;
    const raceName = name.trim();
    const parsedDate = dayjs(date);
    if (!raceName) {
      setError('Enter a race name.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsedDate.isValid() || parsedDate.format('YYYY-MM-DD') !== date) {
      setError('Enter the date as YYYY-MM-DD.');
      return;
    }
    if (date < dayjs().format('YYYY-MM-DD')) {
      setError('Choose today or a future date.');
      return;
    }

    setSaving(true);
    setError(null);
    const { data, error: saveError } = await (supabase.from('races') as any)
      .insert({
        user_id: session.user.id,
        name: raceName,
        event_date: date,
        distance: distance.trim() || null,
        location: location.trim() || null,
      })
      .select('*')
      .single();
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setRaces((current) => [...current, data as Race].sort((left, right) => left.event_date.localeCompare(right.event_date)));
    setName('');
    setDistance('');
    setLocation('');
    setShowForm(false);
  };

  const confirmDelete = (race: Race) => {
    Alert.alert('Remove race', `Remove ${race.name} from your race list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await (supabase.from('races') as any)
            .delete()
            .eq('id', race.id);
          if (deleteError) setError(deleteError.message);
          else setRaces((current) => current.filter((item) => item.id !== race.id));
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>RACE CALENDAR</Text>
          <Text style={styles.title}>Race day</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm((current) => !current)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : 'Add race'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New race</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Race name" placeholderTextColor={colors.textMuted} />
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, styles.halfInput]} value={distance} onChangeText={setDistance} placeholder="Distance" placeholderTextColor={colors.textMuted} />
            <TextInput style={[styles.input, styles.halfInput]} value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor={colors.textMuted} />
          </View>
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => void addRace()} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save race</Text>}
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /></View>
      ) : races.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flag-outline" size={27} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No upcoming races</Text>
          <Text style={styles.emptyText}>Add an event to keep its date and countdown close at hand.</Text>
        </View>
      ) : (
        <View style={styles.raceList}>
          <Text style={styles.listCount}>{races.length} upcoming {races.length === 1 ? 'race' : 'races'}</Text>
          {races.map((race, index) => {
            const daysLeft = dayjs(race.event_date).startOf('day').diff(dayjs().startOf('day'), 'day');
            const nextRace = index === 0;
            return (
              <View key={race.id} style={[styles.race, nextRace && styles.nextRace]}>
                <View style={styles.raceDate}>
                  <Text style={styles.month}>{dayjs(race.event_date).format('MMM').toUpperCase()}</Text>
                  <Text style={styles.day}>{dayjs(race.event_date).format('D')}</Text>
                </View>
                <View style={styles.raceCopy}>
                  <Text style={styles.raceName}>{race.name}</Text>
                  <Text style={styles.raceMeta}>
                    {[race.distance, race.location].filter(Boolean).join(' · ') || dayjs(race.event_date).format('dddd, YYYY')}
                  </Text>
                  <Text style={styles.countdown}>
                    {daysLeft === 0 ? 'Race day is today' : `${daysLeft} days to go`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(race)} accessibilityLabel={`Remove ${race.name}`}>
                  <Ionicons name="ellipsis-horizontal" size={19} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.blue, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  form: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  formTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: spacing.sm, color: colors.text, fontSize: 14, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  saveButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: radius.sm },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  disabledButton: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 12, marginBottom: spacing.sm },
  loading: { padding: spacing.xl, alignItems: 'center' },
  empty: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 5, lineHeight: 19 },
  raceList: { marginTop: spacing.sm },
  listCount: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  race: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  nextRace: { borderLeftWidth: 4, borderLeftColor: colors.blue },
  raceDate: { width: 48, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FF', borderRadius: radius.sm },
  month: { color: colors.blue, fontSize: 10, fontWeight: '900' },
  day: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 1 },
  raceCopy: { flex: 1 },
  raceName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  raceMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  countdown: { color: colors.blue, fontSize: 11, fontWeight: '800', marginTop: 5 },
});