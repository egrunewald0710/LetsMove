import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, sportColor } from '@/theme/theme';
import type { AiCoachMessage, Sport } from '@/types/database';

type PickedAttachment = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  base64?: string;
};

type ChatWorkout = {
  date: string;
  sport: Sport;
  title: string;
  notes: string | null;
  planned_duration_seconds: number | null;
  steps: Array<{
    label: string;
    duration_seconds: number | null;
    distance_meters: number | null;
    target_intensity: string | null;
    repeat_count: number;
  }>;
};

type ChatResponse = { reply: string; workouts: ChatWorkout[] };

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const SUPPORTED_TYPES = [
  'application/pdf',
  'application/json',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
];

function getMimeType(name: string, mimeType?: string | null) {
  const knownType = mimeType?.toLowerCase();
  if (knownType && SUPPORTED_TYPES.includes(knownType)) return knownType;
  const extension = name.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    json: 'application/json',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    csv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return extension ? types[extension] : undefined;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function metadataList(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

function getErrorMessage(error: { message: string; context?: unknown }) {
  return (async () => {
    const context = error.context;
    if (context instanceof Response) {
      const details = await context.clone().json().catch(() => null);
      if (typeof details?.error === 'string') return details.error;
      if (context.status === 404 || details?.code === 'NOT_FOUND') {
        return 'The coach chat function is not deployed. Deploy the triathlon-coach Supabase function.';
      }
      if (typeof details?.message === 'string') return details.message;
    }
    return error.message;
  })();
}

export default function AICoachChatScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiCoachMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [pickingFiles, setPickingFiles] = useState(false);
  const [savingWorkoutId, setSavingWorkoutId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollView = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session?.user.id) {
      setLoadingHistory(false);
      return;
    }

    let cancelled = false;
    const loadLatestConversation = async () => {
      setLoadingHistory(true);
      setError(null);
      try {
        const { data: conversation, error: conversationError } = await (supabase
          .from('ai_coach_conversations') as any)
          .select('id')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (conversationError) throw conversationError;
        if (!conversation) return;

        const { data, error: messagesError } = await (supabase
          .from('ai_coach_messages') as any)
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;
        if (cancelled) return;

        setConversationId(conversation.id);
        setMessages((data ?? []).map((message: AiCoachMessage) => ({
          ...message,
          metadata: message.metadata ?? {},
        })));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load chat history. Apply the AI chat database migration and try again.'
          );
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void loadLatestConversation();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const chooseFiles = async () => {
    setPickingFiles(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const picked = result.assets.map((asset) => {
        const mimeType = getMimeType(asset.name, asset.mimeType);
        if (!mimeType) throw new Error(`${asset.name} is not a supported file type.`);
        const file = new File(asset.uri);
        return {
          uri: asset.uri,
          name: asset.name,
          mimeType,
          size: asset.size ?? file.size ?? 0,
        };
      });
      const combined = [...attachments, ...picked].slice(0, 3);
      const totalSize = combined.reduce((sum, item) => sum + item.size, 0);
      if (combined.some((item) => item.size <= 0) || totalSize > MAX_ATTACHMENT_BYTES) {
        throw new Error('Choose up to 3 files with a combined size of 3 MB or less.');
      }
      setAttachments(combined);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Could not attach those files.');
    } finally {
      setPickingFiles(false);
    }
  };

  const choosePhotos = async () => {
    const remainingSlots = 3 - attachments.length;
    if (remainingSlots <= 0) return;

    setPickingFiles(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;

      const picked = result.assets.map((asset, index) => {
        if (!asset.base64) throw new Error('Could not read the selected photo.');
        const name = asset.fileName || `photo-${Date.now()}-${index + 1}.jpg`;
        return {
          uri: asset.uri,
          name,
          mimeType: 'image/jpeg',
          size: Math.ceil(asset.base64.length * 3 / 4),
          base64: asset.base64,
        };
      });
      const combined = [...attachments, ...picked];
      const totalSize = combined.reduce((sum, item) => sum + item.size, 0);
      if (combined.some((item) => item.size <= 0) || totalSize > MAX_ATTACHMENT_BYTES) {
        throw new Error('Choose up to 3 files with a combined size of 3 MB or less.');
      }
      setAttachments(combined);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Could not attach those photos.');
    } finally {
      setPickingFiles(false);
    }
  };

  const ensureConversation = async (firstMessage: string) => {
    if (conversationId) return conversationId;
    if (!session?.user.id) throw new Error('Sign in to chat with your coach.');
    const title = (firstMessage.trim() || attachments[0]?.name || 'Endurance coaching').slice(0, 80);
    const { data, error: createError } = await (supabase
      .from('ai_coach_conversations') as any)
      .insert({ user_id: session.user.id, title })
      .select('id')
      .single();
    if (createError) throw createError;
    setConversationId(data.id);
    return data.id as string;
  };

  const sendMessage = async () => {
    const content = draft.trim();
    const selectedFiles = [...attachments];
    if ((!content && selectedFiles.length === 0) || sending || !session?.user.id) return;

    setSending(true);
    setError(null);
    try {
      const files = await Promise.all(selectedFiles.map(async (attachment) => ({
        name: attachment.name,
        mimeType: attachment.mimeType,
        base64: attachment.base64 ?? await new File(attachment.uri).base64(),
      })));
      const conversation = await ensureConversation(content);
      const history = messages.slice(-12).map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }));
      const { data, error: invokeError } = await supabase.functions.invoke<ChatResponse>(
        'triathlon-coach',
        { body: { message: content, messages: history, files } }
      );
      if (invokeError) throw new Error(await getErrorMessage(invokeError));
      if (!data || typeof data.reply !== 'string' || !Array.isArray(data.workouts)) {
        throw new Error('The coach returned an invalid response. Please try again.');
      }

      const attachmentMetadata = selectedFiles.map(({ name, mimeType, size }) => ({
        name,
        mimeType,
        size,
      }));
      const { data: userMessage, error: userMessageError } = await (supabase
        .from('ai_coach_messages') as any)
        .insert({
          conversation_id: conversation,
          role: 'user',
          content: content || 'Please review the attached file.',
          metadata: { attachments: attachmentMetadata },
        })
        .select('*')
        .single();
      if (userMessageError) throw userMessageError;

      const { data: assistantMessage, error: assistantMessageError } = await (supabase
        .from('ai_coach_messages') as any)
        .insert({
          conversation_id: conversation,
          role: 'assistant',
          content: data.reply,
          metadata: { workouts: data.workouts, savedWorkoutIds: [] },
        })
        .select('*')
        .single();
      if (assistantMessageError) throw assistantMessageError;

      await (supabase.from('ai_coach_conversations') as any)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation);

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setDraft('');
      setAttachments([]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  const saveWorkout = async (message: AiCoachMessage, workout: ChatWorkout, index: number) => {
    if (!session?.user.id) return;
    const savedWorkoutIds = Array.isArray(message.metadata.savedWorkoutIds)
      ? message.metadata.savedWorkoutIds as string[]
      : [];
    if (savedWorkoutIds.includes(String(index))) return;

    const pendingId = `${message.id}-${index}`;
    setSavingWorkoutId(pendingId);
    setError(null);
    try {
      const plannedDistance = workout.steps.reduce(
        (sum, step) => sum + (step.distance_meters ?? 0) * step.repeat_count,
        0
      );
      const { data, error: workoutError } = await (supabase.from('workouts') as any)
        .insert({
          user_id: session.user.id,
          sport: workout.sport,
          title: workout.title,
          scheduled_date: workout.date,
          planned_duration_seconds: workout.planned_duration_seconds,
          planned_distance_meters: plannedDistance || null,
          notes: workout.notes,
          status: 'planned',
        })
        .select('id')
        .single();
      if (workoutError) throw workoutError;

      if (workout.steps.length > 0) {
        const { error: stepsError } = await (supabase.from('workout_steps') as any).insert(
          workout.steps.map((step, orderIndex) => ({
            workout_id: data.id,
            order_index: orderIndex,
            label: step.label,
            duration_seconds: step.duration_seconds,
            distance_meters: step.distance_meters,
            target_intensity: step.target_intensity,
            repeat_count: step.repeat_count,
          }))
        );
        if (stepsError) throw stepsError;
      }

      const updatedSavedIds = [...savedWorkoutIds, String(index)];
      const updatedMessage = {
        ...message,
        metadata: { ...message.metadata, savedWorkoutIds: updatedSavedIds },
      };
      await (supabase.from('ai_coach_messages') as any)
        .update({ metadata: updatedMessage.metadata })
        .eq('id', message.id);
      setMessages((current) => current.map((item) => item.id === message.id ? updatedMessage : item));
      Alert.alert('Workout added', 'The workout is now in your calendar and workout library.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not add this workout.');
    } finally {
      setSavingWorkoutId(null);
    }
  };

  const renderWorkout = (message: AiCoachMessage, workout: ChatWorkout, index: number) => {
    const savedWorkoutIds = Array.isArray(message.metadata.savedWorkoutIds)
      ? message.metadata.savedWorkoutIds as string[]
      : [];
    const alreadySaved = savedWorkoutIds.includes(String(index));
    const pendingId = `${message.id}-${index}`;
    return (
      <View key={`${message.id}-${index}`} style={styles.suggestedWorkout}>
        <View style={styles.suggestedHeader}>
          <View style={[styles.sportTag, { backgroundColor: `${sportColor(workout.sport)}18` }]}>
            <Text style={[styles.sportTagText, { color: sportColor(workout.sport) }]}>
              {workout.sport.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.workoutDate}>{dayjs(workout.date).format('ddd, D MMM')}</Text>
        </View>
        <Text style={styles.workoutTitle}>{workout.title}</Text>
        {workout.planned_duration_seconds != null && (
          <Text style={styles.workoutMeta}>
            {formatDuration(workout.planned_duration_seconds)}
          </Text>
        )}
        {workout.steps.length > 0 && (
          <Text style={styles.workoutMeta}>
            {workout.steps.map((step) => step.label).join(' · ')}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.addWorkoutButton, alreadySaved && styles.addWorkoutSaved]}
          disabled={alreadySaved || savingWorkoutId === pendingId}
          onPress={() => void saveWorkout(message, workout, index)}
        >
          {savingWorkoutId === pendingId ? (
            <ActivityIndicator size="small" color={colors.blue} />
          ) : (
            <Ionicons name={alreadySaved ? 'checkmark' : 'add'} size={16} color={alreadySaved ? colors.success : colors.blue} />
          )}
          <Text style={[styles.addWorkoutText, alreadySaved && styles.addWorkoutTextSaved]}>
            {alreadySaved ? 'Added to calendar' : 'Add to calendar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={23} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <Text style={styles.headerSubtitle}>Endurance training</Text>
        </View>
        <TouchableOpacity
          style={styles.planButton}
          onPress={() => navigation.navigate('AICoachPlanner')}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.blue} />
          <Text style={styles.planButtonText}>Plan</Text>
        </TouchableOpacity>
      </View>

      {loadingHistory ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue} size="large" />
        </View>
      ) : (
        <ScrollView
          ref={scrollView}
          style={styles.messages}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollView.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="sparkles" size={25} color={colors.blue} />
              </View>
              <Text style={styles.welcomeTitle}>What are you training for?</Text>
              <Text style={styles.welcomeText}>
                Ask about endurance training, share a plan, or describe a workout to add to your calendar.
              </Text>
              <TouchableOpacity
                style={styles.promptSuggestion}
                onPress={() => setDraft('Build me a 60-minute aerobic run for tomorrow.')}
              >
                <Text style={styles.promptText}>Build a workout for me</Text>
                <Ionicons name="arrow-up-outline" size={15} color={colors.blue} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptSuggestion}
                onPress={() => setDraft('How should I structure recovery after a hard interval session?')}
              >
                <Text style={styles.promptText}>Ask about recovery</Text>
                <Ionicons name="arrow-up-outline" size={15} color={colors.blue} />
              </TouchableOpacity>
            </View>
          ) : messages.map((message) => {
            const isUser = message.role === 'user';
            const attachedFiles = metadataList(message.metadata.attachments);
            const workouts = metadataList(message.metadata.workouts) as unknown as ChatWorkout[];
            return (
              <View key={message.id} style={[styles.messageRow, isUser && styles.userMessageRow]}>
                {!isUser && (
                  <View style={styles.assistantAvatar}>
                    <Ionicons name="sparkles" size={13} color={colors.blue} />
                  </View>
                )}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                    {message.content}
                  </Text>
                  {attachedFiles.map((file, index) => (
                    <View key={`${String(file.name)}-${index}`} style={styles.messageAttachment}>
                      <Ionicons
                        name={String(file.mimeType).startsWith('image/') ? 'image-outline' : 'document-text-outline'}
                        size={13}
                        color={isUser ? '#DCEBFF' : colors.blue}
                      />
                      <Text style={[styles.messageAttachmentText, isUser && styles.userMessageText]} numberOfLines={1}>
                        {String(file.name ?? 'Attachment')}
                      </Text>
                    </View>
                  ))}
                  {workouts.map((workout, index) => renderWorkout(message, workout, index))}
                  <Text style={[styles.messageTime, isUser && styles.userTime]}>
                    {dayjs(message.created_at).format('h:mm A')}
                  </Text>
                </View>
              </View>
            );
          })}
          {sending && (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.typingText}>Coach is thinking</Text>
            </View>
          )}
        </ScrollView>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {attachments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentList}>
          {attachments.map((attachment, index) => (
            <View key={`${attachment.name}-${index}`} style={styles.attachmentChip}>
              {attachment.mimeType.startsWith('image/') ? (
                <Image source={{ uri: attachment.uri }} style={styles.attachmentThumbnail} />
              ) : (
                <Ionicons name="document-attach-outline" size={15} color={colors.blue} />
              )}
              <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
              <TouchableOpacity
                onPress={() => setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                accessibilityLabel={`Remove ${attachment.name}`}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.composerWrap}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => void choosePhotos()}
          disabled={sending || pickingFiles || attachments.length >= 3}
          accessibilityLabel="Add photo"
        >
          {pickingFiles ? <ActivityIndicator size="small" color={colors.blue} /> : (
            <Ionicons name="image-outline" size={20} color={colors.blue} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => void chooseFiles()}
          disabled={sending || pickingFiles || attachments.length >= 3}
          accessibilityLabel="Attach files"
        >
          {pickingFiles ? <ActivityIndicator size="small" color={colors.blue} /> : (
            <Ionicons name="attach" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask your endurance coach..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          editable={!sending}
          onSubmitEditing={() => void sendMessage()}
        />
        <TouchableOpacity
          style={[styles.sendButton, ((!draft.trim() && attachments.length === 0) || sending) && styles.sendButtonDisabled]}
          onPress={() => void sendMessage()}
          disabled={(!draft.trim() && attachments.length === 0) || sending}
          accessibilityLabel="Send message"
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : (
            <Ionicons name="arrow-up" size={19} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.attachmentNote}>PDF, text, CSV, JSON, PNG, JPG, or WebP · 3 MB total</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: spacing.sm },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#EAF2FF',
  },
  planButtonText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  messages: { flex: 1 },
  messageList: { padding: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xl },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: { color: colors.text, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  welcomeText: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 7, marginBottom: spacing.md },
  promptSuggestion: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    marginTop: 7,
  },
  promptText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md },
  userMessageRow: { justifyContent: 'flex-end' },
  assistantAvatar: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FF',
    marginRight: 7,
    marginBottom: 3,
  },
  bubble: { maxWidth: '88%', borderRadius: radius.md, padding: spacing.md },
  assistantBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  userBubble: { backgroundColor: colors.navy },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#fff' },
  messageTime: { color: colors.textMuted, fontSize: 10, marginTop: 7, textAlign: 'right' },
  userTime: { color: '#C6D5EB' },
  messageAttachment: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  messageAttachmentText: { color: colors.blue, fontSize: 11, fontWeight: '700', maxWidth: 180 },
  suggestedWorkout: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  suggestedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sportTag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  sportTagText: { fontSize: 9, fontWeight: '900' },
  workoutDate: { color: colors.textMuted, fontSize: 11 },
  workoutTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 7 },
  workoutMeta: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.sm,
    paddingVertical: 8,
    marginTop: spacing.sm,
  },
  addWorkoutSaved: { borderColor: '#BBE4C8', backgroundColor: '#EAF8EF' },
  addWorkoutText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  addWorkoutTextSaved: { color: colors.success },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 32, marginBottom: spacing.sm },
  typingText: { color: colors.textMuted, fontSize: 12 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  attachmentList: { gap: 7, paddingHorizontal: spacing.md, paddingBottom: 7 },
  attachmentChip: {
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  attachmentThumbnail: { width: 28, height: 28, borderRadius: 5 },
  attachmentName: { color: colors.text, fontSize: 11, flexShrink: 1 },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    marginHorizontal: spacing.sm,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  attachButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  composerInput: { flex: 1, maxHeight: 120, minHeight: 40, paddingVertical: 10, color: colors.text, fontSize: 14 },
  sendButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  sendButtonDisabled: { opacity: 0.45 },
  attachmentNote: { color: colors.textMuted, fontSize: 10, textAlign: 'center', paddingVertical: 5 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});