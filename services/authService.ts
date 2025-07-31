// --- PRODUCTION AUTHENTICATION SERVICE (CLIENT-SIDE) ---
// This service is the client-side interface for all interactions
// with the live Supabase backend. It uses the official supabase-js
// client to handle user authentication, profile data, and history.

import { User, AnalysisResult, AnalysisHistoryEntry, AnalysisStatus, AnalysisType } from '../types';
import { getSupabaseClient, type Database } from './supabaseClient';

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
        
        const newProfileData: Database['public']['Tables']['profiles']['Insert'] = {
            id: user.id,
            username: user.email?.split('@')[0] || 'New User',
            allergies: DEFAULT_ALLERGIES,
            preferences: '',
            is_pro: false,
            updated_at: new Date().toISOString(),
        };

        // This is the "healing" step. The profile doesn't exist, so we create it.
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfileData)
            .select()
            .single();
        
        if (insertError) {
            console.error("Failed to create user profile after signup:", insertError);
            throw new Error("Could not create your profile. Please contact support.");
        }
        
         const newUser: User = {
            id: newProfile!.id,
            email: user.email || '', // Safer handling
            is_pro: newProfile!.is_pro,
            username: newProfile!.username,
            allergies: newProfile!.allergies,
            preferences: newProfile!.preferences,
            analysisHistory: [] // New profiles have no history
        };
        return newUser;

    } else if (error) {
        // A different error occurred (network, RLS issue, etc.)
        console.error("Error fetching user profile:", error);
        throw new Error("Could not retrieve user profile.");
    }
    
    // Now fetch the analysis history separately.
    const { data: history, error: historyError } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Fetch in descending order

    if (historyError) {
        console.warn("Could not fetch analysis history, continuing without it.", historyError);
    }

    // The `result` column from Supabase is typed as `Json`. We cast it to the
    // specific `AnalysisResult[]` type for use within the application.
    const analysisHistory: AnalysisHistoryEntry[] = (history || []).map(dbEntry => ({
        ...dbEntry,
        result: dbEntry.result as AnalysisResult[],
    }));
    
    const finalUser: User = {
        id: profile!.id,
        email: user.email || '', // Safer handling
        is_pro: profile!.is_pro,
        username: profile!.username,
        allergies: profile!.allergies,
        preferences: profile!.preferences,
        analysisHistory: analysisHistory,
    };
    return finalUser;
};


export const updateUser = async (dataToUpdate: Partial<Pick<User, 'username' | 'allergies' | 'preferences'>>): Promise<User> => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const updatePayload: Database['public']['Tables']['profiles']['Update'] = {
        ...dataToUpdate,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();
    
    if (error) throw error;
    
    // Fetch the full user object again to get updated history etc.
    return getUserProfile(user);
};

// --- Analysis History Management ---
/**
 * Adds an analysis to a pro user's history.
 * This is now more efficient: it inserts the new record and then updates the
 * user object on the client side, avoiding a full re-fetch of all history.
 */
export const addAnalysisToHistory = async (
    currentUser: User,
    results: AnalysisResult[],
    allergies: string,
    preferences: string,
    inputText: string
): Promise<User> => {
    // If not a pro user, do nothing and return the user object unchanged.
    if (!currentUser.is_pro) {
        return currentUser;
    }
    
    const supabase = getSupabaseClient();
    
    const historyData: Database['public']['Tables']['analysis_history']['Insert'] = {
        user_id: currentUser.id,
        result: results,
        allergies,
        preferences,
        input_text: inputText,
        status: AnalysisStatus.Completed,
        analysis_type: AnalysisType.MenuAnalysis
    };

    // Insert the new record and select it back to get the DB-generated `id` and `created_at`.
    const { data: newHistoryDbEntry, error } = await supabase
        .from('analysis_history')
        .insert(historyData)
        .select()
        .single();

    if (error) {
        console.error("Error adding to history:", error);
        // If the insert fails, return the original user object so the app can continue.
        return currentUser;
    }

    // Manually construct the new history entry for our application state.
    const newHistoryEntry: AnalysisHistoryEntry = {
        ...newHistoryDbEntry,
        result: newHistoryDbEntry.result as AnalysisResult[], // Cast from Json to AnalysisResult[]
    };

    // Return an updated user object with the new history item at the top.
    // This is much faster than re-fetching the entire profile and history list.
    return {
        ...currentUser,
        analysisHistory: [newHistoryEntry, ...currentUser.analysisHistory],
    };
};


export const deleteAnalysisFromHistory = async (historyId: number): Promise<void> => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('analysis_history')
        .delete()
        .eq('id', historyId);

    if (error) {
        console.error("Error deleting history item:", error);
        throw new Error("Could not delete the analysis from your history. Please try again.");
    }
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