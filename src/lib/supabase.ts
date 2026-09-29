import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// =====================================================================
// 👇 PUT YOUR SUPABASE CREDENTIALS HERE 👇
//
// Easiest option: create a `.env` file in the project root (copy
// `.env.example` to `.env`) and set these two values there:
//
//   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
//
// Both are found in your Supabase dashboard under
// Project Settings -> API. Use the "anon public" key, NEVER the
// service_role secret key in the app.
//
// If you don't want to use a .env file, you can instead just
// hardcode the two strings directly below as a fallback.
// =====================================================================
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://YOUR-PROJECT-REF.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR-ANON-PUBLIC-KEY';

if (supabaseUrl.includes('YOUR-PROJECT-REF') || supabaseAnonKey.includes('YOUR-ANON')) {
  console.warn(
    '[LetsMove] Supabase is not configured yet. Add your URL and anon key ' +
      'in a .env file (see .env.example) or directly in src/lib/supabase.ts'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
