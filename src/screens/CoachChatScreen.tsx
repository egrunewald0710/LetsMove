import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme/theme';

type CoachMessage = {
  id: string;
  coach_id: string;
  athlete_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default function CoachChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const chatId = route.params?.chatId;
  const [coachName, setCoachName] = useState('Your coach');
  const [coachId, setCoachId] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<'open' | 'closed'>('open');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollView = useRef<ScrollView>(null);

  const loadConversation = useCallback(async () => {
    if (!session?.user.id || !chatId) {
      setError('This conversation could not be found.');
      setLoading(false);
      return;
    }

    const { data: chat, error: chatError } = await (supabase.from('chats') as any)
      .select('id,coach_id,status')
      .eq('id', chatId)
      .eq('athlete_id', session.user.id)
      .maybeSingle();
    if (chatError || !chat) {
      setError(chatError?.message ?? 'This conversation is not available to your account.');
      setLoading(false);
      return;
    }

    setCoachId(chat.coach_id);
    setChatStatus(chat.status);
    const { data: coachProfile } = await (supabase.from('profiles') as any)
      .select('full_name')
      .eq('id', chat.coach_id)
      .maybeSingle();
    if (coachProfile?.full_name) setCoachName(coachProfile.full_name);

    const { data, error: messageError } = await (supabase.from('coach_messages') as any)
      .select('id,coach_id,athlete_id,sender_id,body,created_at,read_at')
      .eq('coach_id', chat.coach_id)
      .eq('athlete_id', session.user.id)
      .order('created_at', { ascending: true });
    if (messageError) {
      setError(messageError.message);
      setLoading(false);
      return;
    }
    const loadedMessages = (data ?? []) as CoachMessage[];
    setMessages(loadedMessages);
    let readReceiptError: string | null = null;
    const unreadIds = loadedMessages
      .filter((message) => message.sender_id !== session.user.id && !message.read_at)
      .map((message) => message.id);
    if (unreadIds.length) {
      const { error: readError } = await (supabase.from('coach_messages') as any)
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
      if (readError) readReceiptError = 'Messages loaded, but read receipts could not be updated.';
    }
    setError(readReceiptError);
    setLoading(false);
  }, [chatId, session?.user.id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void loadConversation();
    const interval = setInterval(() => void loadConversation(), 10000);
    const channel = coachId && session?.user.id
      ? supabase
        .channel(`coach-messages-${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
          filter: `coach_id=eq.${coachId}`,
        }, (payload) => {
          const newMessage = payload.new as CoachMessage;
          if (newMessage.athlete_id === session.user.id) void loadConversation();
        })
        .subscribe()
      : null;
    return () => {
      clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [chatId, coachId, loadConversation, session?.user.id]));

  useEffect(() => {
    if (messages.length) scrollView.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !session?.user.id || sending || chatStatus !== 'open') return;
    setSending(true);
    setError(null);
    if (!coachId) {
      setError('Your coach assignment could not be verified. Reopen this chat and try again.');
      setSending(false);
      return;
    }
    const { data, error: sendError } = await (supabase.from('coach_messages') as any)
      .insert({ coach_id: coachId, athlete_id: session.user.id, sender_id: session.user.id, body: content })
      .select('id,coach_id,athlete_id,sender_id,body,created_at,read_at')
      .single();
    if (sendError) {
      setError(sendError.message);
    } else {
      setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as CoachMessage]);
      setDraft('');
    }
    setSending(false);
  };

  const formatMessageTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to marketplace">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.coachAvatar}><Ionicons name="person-outline" size={19} color="#315F4D" /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.coachName}>{coachName}</Text>
          <Text style={styles.headerStatus}>{chatStatus === 'open' ? 'Your assigned coach' : 'Conversation closed'}</Text>
        </View>
        <View style={[styles.statusDot, chatStatus === 'closed' && styles.statusDotClosed]} />
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator color={colors.blue} /><Text style={styles.stateText}>Loading conversation…</Text></View>
      ) : error && !messages.length ? (
        <View style={styles.centerState}><Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textMuted} /><Text style={styles.stateTitle}>Chat unavailable</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); void loadConversation(); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>
      ) : (
        <>
          <ScrollView
            ref={scrollView}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollView.current?.scrollToEnd({ animated: false })}
          >
            <View style={styles.introCard}>
              <View style={styles.introIcon}><Ionicons name="chatbubbles-outline" size={19} color="#315F4D" /></View>
              <Text style={styles.introTitle}>A direct line to your coach</Text>
              <Text style={styles.introBody}>Your messages are shared only with your assigned coach.</Text>
            </View>
            {messages.length === 0 ? (
              <Text style={styles.firstMessageHint}>Start the conversation whenever you’re ready.</Text>
            ) : messages.map((message) => {
              const ownMessage = message.sender_id === session?.user.id;
              return (
                <View key={message.id} style={[styles.messageRow, ownMessage ? styles.ownMessageRow : styles.coachMessageRow]}>
                  <View style={[styles.messageBubble, ownMessage ? styles.ownBubble : styles.coachBubble]}>
                    <Text style={[styles.messageText, ownMessage && styles.ownMessageText]}>{message.body}</Text>
                    <Text style={[styles.messageTime, ownMessage && styles.ownMessageTime]}>{formatMessageTime(message.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          {error && <Text style={styles.inlineError}>{error}</Text>}
          {chatStatus === 'closed' ? (
            <View style={styles.closedNotice}><Ionicons name="lock-closed-outline" size={16} color="#7B6B46" /><Text style={styles.closedText}>This conversation is closed. Ask your coach to reopen it.</Text></View>
          ) : (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                placeholderTextColor="#89919D"
                multiline
                maxLength={4000}
                returnKeyType="default"
                accessibilityLabel="Message your coach"
              />
              <TouchableOpacity
                style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
                onPress={() => void sendMessage()}
                disabled={!draft.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  coachAvatar: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1E5', borderRadius: 19 },
  headerCopy: { flex: 1, gap: 3 },
  coachName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  headerStatus: { color: colors.textMuted, fontSize: 10 },
  statusDot: { width: 8, height: 8, backgroundColor: '#69A16F', borderRadius: 5 },
  statusDotClosed: { backgroundColor: '#A9A99F' },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.lg },
  introCard: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, marginBottom: spacing.md, backgroundColor: '#EDF2E8', borderRadius: radius.md },
  introIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, backgroundColor: '#DDE8D4', borderRadius: 20 },
  introTitle: { color: '#31473A', fontSize: 13, fontWeight: '800' },
  introBody: { maxWidth: 250, marginTop: 5, color: '#718075', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  firstMessageHint: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  messageRow: { width: '100%', marginBottom: 10 },
  ownMessageRow: { alignItems: 'flex-end' },
  coachMessageRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '84%', paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6, borderRadius: 12 },
  ownBubble: { backgroundColor: '#315F4D', borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  messageText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  ownMessageText: { color: '#fff' },
  messageTime: { alignSelf: 'flex-end', marginTop: 4, color: colors.textMuted, fontSize: 9 },
  ownMessageTime: { color: '#C5D8CE' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, fontSize: 13 },
  sendButton: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#315F4D', borderRadius: 20 },
  sendButtonDisabled: { opacity: 0.45 },
  inlineError: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, color: colors.danger, backgroundColor: colors.card, fontSize: 10 },
  closedNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: '#F4F0E4', borderTopWidth: 1, borderTopColor: '#E9E1CB' },
  closedText: { flex: 1, color: '#776744', fontSize: 11 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  stateTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  stateText: { maxWidth: 280, color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  retryButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.md, marginTop: spacing.xs, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  retryText: { color: '#315F4D', fontSize: 11, fontWeight: '800' },
});