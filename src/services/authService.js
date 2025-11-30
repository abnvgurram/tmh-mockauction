// src/services/authService.js
import { supabase } from './supabaseClient';

/**
 * Login user with email and password
 * Returns user data with role and team info
 */
export const loginUser = async (email, password) => {
  try {
    console.log('🔐 Attempting login for:', email);

    // First, get user details from our users table to verify credentials
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error('❌ User not found:', userError);
      throw new Error('Invalid email or password');
    }

    console.log('✅ User found:', userData.email, 'Role:', userData.role);

    // Verify password using Supabase's crypt function
    const { data: passwordCheck, error: passwordError } = await supabase.rpc(
      'verify_password',
      {
        input_email: email,
        input_password: password,
      }
    );

    if (passwordError || !passwordCheck) {
      console.error('❌ Password verification failed:', passwordError);
      throw new Error('Invalid email or password');
    }

    console.log('✅ Password verified');

    // Update login status
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_logged_in: true })
      .eq('id', userData.id);

    if (updateError) {
      console.error('⚠️ Failed to update login status:', updateError);
    } else {
      console.log('✅ Login status set to TRUE for:', userData.email);
    }

    // Store in localStorage for session persistence
    localStorage.setItem('currentUser', JSON.stringify(userData));

    console.log('✅ Login successful for:', userData.email);

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
};

/**
 * Logout current user
 */
export const logoutUser = async () => {
  try {
    const currentUser = getCurrentUserFromStorage();
    
    if (currentUser) {
      console.log('🚪 Logging out:', currentUser.email);

      // Update login status in database
      const { error } = await supabase
        .from('users')
        .update({ is_logged_in: false })
        .eq('id', currentUser.id);

      if (error) {
        console.error('⚠️ Failed to update logout status:', error);
      } else {
        console.log('✅ Login status set to FALSE for:', currentUser.email);
      }
    }

    // Clear localStorage
    localStorage.removeItem('currentUser');

    console.log('✅ Logout successful');

    return { success: true };
  } catch (error) {
    console.error('❌ Logout error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user from localStorage
 */
export const getCurrentUserFromStorage = () => {
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return getCurrentUserFromStorage() !== null;
};

/**
 * Get user role
 */
export const getUserRole = () => {
  const user = getCurrentUserFromStorage();
  return user?.role || null;
};