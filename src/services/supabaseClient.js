// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Your Supabase credentials
const supabaseUrl = 'https://zujwftjkffmsxrirgmfq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1andmdGprZmZtc3hyaXJnbWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTI2MTUsImV4cCI6MjA3OTg2ODYxNX0.EhNzKBXbUG5djzOGjD-oLP3xRn4Lg-KTolrqAksz7QM';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  return true;
};