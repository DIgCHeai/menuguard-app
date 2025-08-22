import type { Chat } from '@google/genai';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export enum SafetyLevel {
    Safe = 'safe',
    Caution = 'caution',
    Unsafe = 'unsafe',
}

export interface AnalysisResult {
    itemName: string;
    safetyLevel: SafetyLevel;
    reasoning: string;
    identifiedAllergens: string[];
}

// Aligned with the `analysis_history` table in supabase_schema.sql
export enum AnalysisStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed'
}

// Aligned with the `analysis_history` table in supabase_schema.sql
export enum AnalysisType {
  MenuAnalysis = 'menu_analysis'
  // Future types could be added here, e.g., 'ingredient_check'
}

// New type to track the input source for better error messaging
export type AnalysisInputType = 'url' | 'image' | 'text' | null;


// New type for a single history entry, aligned with the `analysis_history` table
export interface AnalysisHistoryEntry {
    id: number; // BIGINT IDENTITY in SQL maps to number
    user_id: string; // UUID of the user
    created_at: string; // timestamp with time zone maps to string
    status: AnalysisStatus;
    analysis_type: AnalysisType;
    input_text: string;
    result: AnalysisResult[]; // from result JSONB
    allergies: string; 
    preferences: string;
}

// Updated User interface, aligned with the `profiles` table in supabase_schema.sql
export interface User {
    id: string; // The user's UUID from auth.users
    email: string;
    is_pro: boolean | null;
    username: string;
    allergies: string | null;
    preferences?: string | null;
    max_analyses_per_month?: number | null;
    analysisHistory: AnalysisHistoryEntry[]; // History can be joined from the `analysis_history` table.
}

// Type for a restaurant found via Google Places API
export interface Restaurant {
    place_id: string;
    name: string;
    vicinity: string;
    website?: string;
    photoUrl?: string;
    rating?: number;
    user_ratings_total?: number;
    isOpen: boolean;
    opening_hours?: any;
}

// Types for chat feature
export type ChatRole = 'user' | 'model';

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

// New type for Google Search grounding sources
export interface GroundingSource {
    uri: string;
    title: string;
}