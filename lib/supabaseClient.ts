import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kubuqoazrafjhsdeffny.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1YnVxb2F6cmFmamhzZGVmZm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNTgzNDQsImV4cCI6MjA2ODczNDM0NH0.31oJhLNctzlY9mEo6g_O0_ObXwAnMu7qg26a2rn6gd4';

// Create Supabase client with explicit auth configuration
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token', // Use standard key for better compatibility
  },
});

export default supabase;