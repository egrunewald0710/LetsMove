import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme/theme';
import { signInWithSocialProvider } from '@/lib/socialAuth';

export default function SocialAuthButtons({ disabled = false }: { disabled?: boolean }) {
  const [busyProvider, setBusyProvider] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: 'apple' | 'google') => {
    if (disabled || busyProvider) return;
    setError(null);
    setBusyProvider(provider);
    const result = await signInWithSocialProvider(provider);
    setBusyProvider(null);
    if (result.error) setError(result.error);
  };

  const appleBusy = busyProvider === 'apple';
  const googleBusy = busyProvider === 'google';
  const buttonsDisabled = disabled || busyProvider !== null;

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.providerButton, styles.appleButton]}
        onPress={() => void handleSignIn('apple')}
        disabled={buttonsDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {appleBusy ? <ActivityIndicator color="#fff" /> : <Ionicons name="logo-apple" size={19} color="#fff" />}
        <Text style={styles.appleText}>Continue with Apple</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.providerButton}
        onPress={() => void handleSignIn('google')}
        disabled={buttonsDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {googleBusy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
        )}
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  providerButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  appleButton: { backgroundColor: '#000', borderColor: '#000' },
  appleText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  googleText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 2 },
});