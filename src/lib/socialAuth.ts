import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

type SocialProvider = 'apple' | 'google';

const redirectTo = Linking.createURL('auth/callback');

function getCallbackParams(url: string) {
  const parsedUrl = new URL(url);
  const query = new URLSearchParams(parsedUrl.search);
  const fragment = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  return {
    get: (key: string) => query.get(key) ?? fragment.get(key),
  };
}

async function finishBrowserOAuth(url: string) {
  const params = getCallbackParams(url);
  const authError = params.get('error_description') ?? params.get('error');
  if (authError) return { error: authError };

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { error: error?.message ?? null };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return { error: error?.message ?? null };
  }

  return { error: 'Sign-in did not return a session. Please try again.' };
}

async function signInWithApple() {
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    return { error: 'Apple did not return an identity token. Please try again.' };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });
  return { error: error?.message ?? null };
}

async function signInWithBrowser(provider: SocialProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: 'Could not start sign-in. Please try again.' };

  if (__DEV__) {
    console.info('[social-auth] redirectTo:', redirectTo);
    console.info('[social-auth] Supabase redirect_to:', new URL(data.url).searchParams.get('redirect_to'));
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { error: null };
  return finishBrowserOAuth(result.url);
}

export async function signInWithSocialProvider(provider: SocialProvider) {
  if (provider === 'apple' && Platform.OS === 'ios') {
    try {
      return await signInWithApple();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ERR_REQUEST_CANCELED') || message.includes('user canceled')) {
        return { error: null };
      }
    }
  }

  try {
    return await signInWithBrowser(provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not sign in. Please try again.';
    return { error: message };
  }
}