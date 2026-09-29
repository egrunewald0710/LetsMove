import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';

const ENABLED_KEY = 'letsmove:workout-reminders-enabled';
const IDS_KEY = 'letsmove:workout-reminder-ids';
const CHANNEL_ID = 'workout-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getWorkoutRemindersEnabled() {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
}

async function cancelStoredReminders() {
  const stored = await AsyncStorage.getItem(IDS_KEY);
  let identifiers: string[] = [];
  try {
    identifiers = stored ? JSON.parse(stored) : [];
  } catch {
    identifiers = [];
  }
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
    )
  );
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify([]));
}

export async function syncWorkoutReminders() {
  if (!(await getWorkoutRemindersEnabled())) {
    await cancelStoredReminders();
    return;
  }

  if (Platform.OS === 'web') return;
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') return;

  const today = dayjs().format('YYYY-MM-DD');
  const throughDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
  const { data, error } = await (supabase.from('workouts') as any)
    .select('id, title, scheduled_date')
    .eq('status', 'planned')
    .gte('scheduled_date', today)
    .lte('scheduled_date', throughDate)
    .order('scheduled_date', { ascending: true })
    .limit(100);

  if (error) throw error;
  await cancelStoredReminders();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const identifiers: string[] = [];
  for (const workout of data ?? []) {
    const fireDate = new Date(`${workout.scheduled_date}T08:00:00`);
    if (Number.isNaN(fireDate.getTime()) || fireDate.getTime() <= Date.now()) continue;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Workout today',
        body: workout.title,
        data: { workoutId: workout.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: CHANNEL_ID,
      },
    });
    identifiers.push(identifier);
  }
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(identifiers));
}

export async function setWorkoutRemindersEnabled(enabled: boolean) {
  if (enabled) {
    if (Platform.OS === 'web') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Workout reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const permissions = current.status === 'granted'
      ? current
      : await Notifications.requestPermissionsAsync();
    if (permissions.status !== 'granted') return false;
  }

  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  await syncWorkoutReminders();
  return true;
}