import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// Check if credentials are set and are not placeholders
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co' && 
  supabaseAnonKey !== 'your-anon-public-key';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

console.log('Supabase Connection Status:', {
  configured: isSupabaseConfigured,
  url: supabaseUrl ? 'Provided' : 'Missing',
  key: supabaseAnonKey ? 'Provided' : 'Missing',
  projectRef: supabaseUrl?.match(/^https:\/\/([^.]+)\.supabase\.co$/)?.[1] || 'unknown'
});
