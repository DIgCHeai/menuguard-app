// --- PRODUCTION AUTHENTICATION SERVICE (CLIENT-SIDE) ---
// This service is the client-side interface for all interactions
// with the live Supabase backend. It uses the official supabase-js
// client to handle user authentication, profile data, and history.

import { User, AnalysisResult, AnalysisHistoryEntry, AnalysisStatus, AnalysisType, Json, SafetyLevel } from '../types';
import { getSupabaseClient, type Database } from './supabaseClient';
import { isAnalysisResultArray } from './utils';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const GUEST_ALLERGY_KEY = 'menu-guard-guest-allergies';
const DEFAULT_ALLERGIES = 'Peanuts, Shellfish, Gluten';
const DEFAULT_ANALYSIS_LIMIT = 5;

// --- Core Auth Functions using modern Supabase v2 syntax ---

export const signup = async (email: string, password: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
};

export const login = async (email: string, password: string): Promise<User> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Login successful, but no user data returned.');

  return getUserProfile(data.user);
};

export const logout = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// --- Password Reset ---
export const requestPasswordReset = async (email: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

export const resetPassword = async (newPassword: string): Promise<User> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  if (!data.user) throw new Error('Password reset successful, but no user returned.');

  return getUserProfile(data.user);
};

// --- User Data Management ---

/**
 * Retrieves a user's profile from the `profiles` table.
 * If the profile doesn't exist (e.g., on first login after email verification),
 * this function automatically creates a default profile for them.
 */
export const getUserProfile = async (user: SupabaseUser): Promise<User> => {
  const supabase = getSupabaseClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`*`)
    .eq('id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    console.log('Profile not found for new user, creating one...');

    const newProfileData: Database['public']['Tables']['profiles']['Insert'] = {
      id: user.id,
      username: user.email?.split('@')[0] || 'New User',
      allergies: DEFAULT_ALLERGIES,
      preferences: '',
      is_pro: false,
      updated_at: new Date().toISOString(),
      max_analyses_per_month: DEFAULT_ANALYSIS_LIMIT,
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfileData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create user profile after signup:', insertError);
      throw new Error('Could not create your profile. Please contact support.');
    }

    const newUser: User = {
      id: newProfile!.id,
      email: user.email || null,
      is_pro: newProfile!.is_pro,
      username: newProfile!.username,
      allergies: newProfile!.allergies,
      preferences: newProfile!.preferences,
      max_analyses_per_month: newProfile!.max_analyses_per_month,
      analysisHistory: [],
    };
    return newUser;
  } else if (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Could not retrieve user profile.');
  }

  const { data: history, error: historyError } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (historyError) {
    console.warn('Could not fetch analysis history, continuing without it.', historyError);
  }

  const analysisHistory: AnalysisHistoryEntry[] = (history || []).map((dbEntry) => {
    if (isAnalysisResultArray(dbEntry.result)) {
      return { ...dbEntry, result: dbEntry.result } as AnalysisHistoryEntry;
    } else {
      console.warn('Invalid analysis result format in history item:', dbEntry.id);
      const safeResult: AnalysisResult[] = [
        {
          itemName: 'Data Error',
          safetyLevel: SafetyLevel.Unsafe,
          reasoning: 'The result from the database was in an invalid format and could not be displayed.',
          identifiedAllergens: [],
        },
      ];
      return { ...dbEntry, result: safeResult } as AnalysisHistoryEntry;
    }
  });

  const finalUser: User = {
    id: profile!.id,
    email: user.email || null,
    is_pro: profile!.is_pro,
    username: profile!.username,
    allergies: profile!.allergies,
    preferences: profile!.preferences,
    max_analyses_per_month: profile!.max_analyses_per_month,
    analysisHistory,
  };
  return finalUser;
};

export const updateUser = async (
  dataToUpdate: Partial<Pick<User, 'username' | 'allergies' | 'preferences'>>
): Promise<User> => {
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated.');

  const updatePayload: Database['public']['Tables']['profiles']['Update'] = {
    ...dataToUpdate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;

  return getUserProfile(user);
};

// --- Analysis History Management ---
/**
 * Adds an analysis to a user's history.
 * The database trigger `check_monthly_analysis_limit` will automatically
 * enforce limits for non-pro users.
 */
export const addAnalysisToHistory = async (
  currentUser: User,
  results: AnalysisResult[],
  allergies: string,
  preferences: string,
  inputText: string
): Promise<User> => {
  const supabase = getSupabaseClient();

  const historyData: Database['public']['Tables']['analysis_history']['Insert'] = {
    user_id: currentUser.id,
    result: results as unknown as Json,
    allergies,
    preferences,
    input_text: inputText,
    status: AnalysisStatus.Completed,
    analysis_type: AnalysisType.MenuAnalysis,
  };

  const { data: newHistoryDbEntry, error } = await supabase
    .from('analysis_history')
    .insert(historyData)
    .select()
    .single();

  if (error) {
    console.error('Error adding to history:', error);
    throw error;
  }

  if (!newHistoryDbEntry) {
    throw new Error('Failed to add to history: no data returned after insert.');
  }

  const newHistoryEntry: AnalysisHistoryEntry = {
    ...newHistoryDbEntry,
    result: isAnalysisResultArray(newHistoryDbEntry.result)
      ? newHistoryDbEntry.result
      : [
          {
            itemName: 'Data Error',
            safetyLevel: SafetyLevel.Unsafe,
            reasoning: 'Could not read analysis result after saving.',
            identifiedAllergens: [],
          },
        ],
  };

  // Return an updated User object with all properties preserved
  return {
    ...currentUser,
    analysisHistory: [newHistoryEntry, ...currentUser.analysisHistory.filter(h => h.id !== newHistoryEntry.id)], // Avoid duplicates
    username: currentUser.username, // Explicitly preserve username
    email: currentUser.email, // Explicitly preserve email
    is_pro: currentUser.is_pro,
    allergies: currentUser.allergies,
    preferences: currentUser.preferences,
    max_analyses_per_month: currentUser.max_analyses_per_month,
  };
};

export const deleteAnalysisFromHistory = async (historyId: number): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('analysis_history')
    .delete()
    .eq('id', historyId);

  if (error) {
    console.error('Error deleting history item:', error);
    throw new Error('Could not delete the analysis from your history. Please try again.');
  }
};

// --- Guest Functionality ---
export const saveGuestAllergies = (allergies: string): void => {
  try {
    localStorage.setItem(GUEST_ALLERGY_KEY, allergies);
  } catch (e) {
    console.warn('Could not save guest allergies to localStorage.');
  }
};

export const loadGuestAllergies = (): string => {
  try {
    return localStorage.getItem(GUEST_ALLERGY_KEY) || DEFAULT_ALLERGIES;
  } catch (e) {
    console.warn('Could not load guest allergies from localStorage.');
    return DEFAULT_ALLERGIES;
  }
};

// --- Pro Upgrade Flow ---
export const initiateProUpgrade = async (): Promise<{ checkoutUrl: string }> => {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upgrade.');

  console.log('SIMULATION: Calling edge function to create Stripe session...');
  const simulatedUrl = `https://checkout.stripe.com/pay/cs_test_${btoa(user.email || '').substring(0, 30)}`;
  return { checkoutUrl: simulatedUrl };
};

export const upgradeToPro = async (): Promise<User> => {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated for upgrade.');

  const { error } = await supabase
    .from('profiles')
    .update({ is_pro: true, max_analyses_per_month: null })
    .eq('id', user.id);

  if (error) {
    console.error('Error upgrading user to pro:', error);
    throw new Error('Failed to update your account to Pro status.');
  }

  return getUserProfile(user);
};