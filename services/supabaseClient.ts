// --- Supabase Client Initialization ---
// This file creates and exports a single instance of the Supabase client.
// This ensures that the entire application shares the same connection
// and configuration, which is a best practice.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
// We import our specific types to provide strong typing for the database client.
import type { AnalysisStatus, AnalysisType, Json } from '../types';

// --- Database Type Definitions (auto-generated or manually created) ---
// This provides TypeScript intelligence for our database tables.

export interface Database {
  public: {
    Tables: {
      analysis_history: {
        Row: {
          id: number
          user_id: string
          created_at: string
          status: AnalysisStatus
          analysis_type: AnalysisType
          input_text: string
          result: Json
          allergies: string
          preferences: string
        }
        Insert: {
          id?: number // Defaults to identity
          user_id: string
          created_at?: string // Defaults to now()
          status: AnalysisStatus
          analysis_type: AnalysisType
          input_text: string
          result: Json
          allergies: string
          preferences: string
        }
        Update: {
          id?: number
          user_id?: string
          created_at?: string
          status?: AnalysisStatus
          analysis_type?: AnalysisType
          input_text?: string
          result?: Json
          allergies?: string
          preferences?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          allergies: string | null
          preferences: string | null
          is_pro: boolean | null
          max_analyses_per_month: number | null
        }
        Insert: {
          id: string // UUID from auth.users
          updated_at?: string | null
          username?: string | null
          allergies?: string | null
          preferences?: string | null
          is_pro?: boolean | null
          max_analyses_per_month?: number | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          allergies?: string | null
          preferences?: string | null
          is_pro?: boolean | null
          max_analyses_per_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


// The client is no longer created immediately with static keys.
// It will be initialized by the main App component after fetching the keys.
let supabaseInstance: SupabaseClient<Database> | null = null;

export const initSupabase = (url: string, anonKey: string): void => {
    if (!url || !anonKey) {
        throw new Error("Supabase URL or Key is missing for initialization.");
    }
    // Initialize only once to maintain a single connection.
    if (!supabaseInstance) {
        supabaseInstance = createClient<Database>(url, anonKey);
        console.log("Supabase client initialized.");
    }
};

/**
 * Returns the initialized Supabase client instance.
 * Throws an error if the client has not been initialized yet,
 * preventing race conditions and ensuring the app fails gracefully
 * if configuration is missing.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
    if (!supabaseInstance) {
        throw new Error("Supabase client has not been initialized. Call initSupabase first.");
    }
    return supabaseInstance;
};