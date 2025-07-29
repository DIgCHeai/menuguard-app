// --- PRODUCTION AUTHENTICATION SERVICE (CLIENT-SIDE) ---
// This service is the client-side interface for all interactions
// with the live Supabase backend. It uses the official supabase-js
// client to handle user authentication, profile data, and history.

import { User, AnalysisResult, AnalysisHistoryEntry } from '../types';
import { getSupabaseClient, Json } from './supabaseClient';

const GUEST_ALLERGY_KEY = 'menu-guard-guest-allergies';
const DEFAULT_ALLERGIES = 'Peanuts, Shellfish, Gluten';

// --- Core Auth Functions using modern Supabase v2 syntax ---

export const signup = async (email: string, password: string): Promise<void> => {
    const supabase = getSupabaseClient();
    // This function ONLY creates the authentication user.
    // The profile is created on the first login by the "self-healing" getUserProfile function.
    // This respects Supabase's email verification security model.
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
    if (!data.user) throw new Error("Login successful, but no user data returned.");

    // After a successful login, fetch their profile. The self-healing logic
    // in getUserProfile will handle creating it if it's their first time.
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    if (error) throw error;
};

export const resetPassword = async (newPassword: string): Promise<User> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    if (!data.user) throw new Error("Password reset successful, but no user returned.");
    
    return getUserProfile(data.user);
}

// --- User Data Management ---

/**
 * Retrieves a user's profile from the `profiles` table.
 * If the profile doesn't exist (e.g., on first login after email verification),
 * this function automatically creates a default profile for them.
 * This is the "self-healing" mechanism that resolves the signup race condition.
 */
export const getUserProfile = async (user: { id: string; email?: string }): Promise<User> => {
    const supabase = getSupabaseClient();
    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', user.id)
        .single();

    // The user's profile was not found. This is expected on first login.
    if (error && error.code === 'PGRST116') {
        console.log('Profile not found for new user, creating one...');
        // This is the "healing" step. The profile doesn't exist, so we create it.
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                username: user.email?.split('@')[0] || 'New User',
                allergies: DEFAULT_ALLERGIES,
                preferences: '',
                is_pro: false,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();
        
        if (insertError) {
            console.error("Failed to create user profile after signup:", insertError);
            throw new Error("Could not create your profile. Please contact support.");
        }
        
         return {
            ...newProfile!,
            email: user.email!,
            analysisHistory: [] // New profiles have no history
        };
    } else if (error) {
        // A different error occurred (network, RLS issue, etc.)
        console.error("Error fetching user profile:", error);
        throw new Error("Could not retrieve user profile.");
    }
    
    // Now fetch the analysis history separately.
    const { data: history, error: historyError } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id);

    if (historyError) {
        console.warn("Could not fetch analysis history, continuing without it.", historyError);
    }
    
    return {
        ...profile!,
        email: user.email!,
        analysisHistory: (history as AnalysisHistoryEntry[]) || [],
    };
};


export const updateUser = async (dataToUpdate: Partial<Pick<User, 'username' | 'allergies' | 'preferences'>>): Promise<User> => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('profiles')
        .update({ ...dataToUpdate, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
    
    if (error) throw error;
    
    // Fetch the full user object again to get updated history etc.
    return getUserProfile(user);
};

// --- Analysis History Management ---
export const addAnalysisToHistory = async (
    results: AnalysisResult[],
    allergies: string,
    preferences: string,
    inputText: string
): Promise<User | null> => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await getUserProfile(user);
    if (!profile.is_pro) return profile;

    const { error } = await supabase
        .from('analysis_history')
        .insert({
            user_id: user.id,
            result: results,
            allergies,
            preferences,
            input_text: inputText,
            status: 'completed',
            analysis_type: 'menu_analysis'
        });

    if (error) {
        console.error("Error adding to history:", error);
        return profile;
    }

    return getUserProfile(user);
};

// --- Guest Functionality ---
export const saveGuestAllergies = (allergies: string): void => {
    try {
        localStorage.setItem(GUEST_ALLERGY_KEY, allergies);
    } catch (e) {
        console.warn("Could not save guest allergies to localStorage.");
    }
};

export const loadGuestAllergies = (): string => {
    try {
        return localStorage.getItem(GUEST_ALLERGY_KEY) || DEFAULT_ALLERGIES;
    } catch (e) {
        console.warn("Could not load guest allergies from localStorage.");
        return DEFAULT_ALLERGIES;
    }
};

// --- Pro Upgrade Flow (simulated for now) ---
export const initiateProUpgrade = async (): Promise<{ checkoutUrl: string }> => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to upgrade.");
    
    console.log("SIMULATION: Calling edge function to create Stripe session...");
    const simulatedUrl = `https://checkout.stripe.com/pay/cs_test_${btoa(user.email || '').substring(0, 30)}`;
    return { checkoutUrl: simulatedUrl };
}