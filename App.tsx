import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  AnalysisResult,
  ChatMessage,
  AppUser, // renamed from User
  GroundingSource,
  AnalysisInputType,
  Restaurant,
  AnalysisHistoryEntry,
} from './types';
import { analyzeMenu, startMenuChat, continueChat, summarizeSafeOptions } from './services/geminiService';
import * as authService from './services/authService';
import { findNearbyRestaurants } from './services/placesService';
import AllergyInput from './components/AllergyInput';
import MenuInput from './components/MenuInput';
import ResultsDisplay from './components/ResultsDisplay';
import Spinner from './components/Spinner';
import { InfoIcon } from './components/icons/InfoIcon';
import QRCodeScanner from './components/QRCodeScanner';
import { MenuGuardLogo } from './components/icons/MenuGuardLogo';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';
import { LoginIcon } from './components/icons/LoginIcon';
import { UserIcon } from './components/icons/UserIcon';
import ProfileSettings from './components/ProfileManager';
import UserSettingsDisplay from './components/UserSettingsDisplay';
import { AnalysisHistoryModal } from './components/AnalysisHistoryModal';
import WelcomeHero from './components/WelcomeHero';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { initSupabase, getSupabaseClient } from './services/supabaseClient';
import NearbyRestaurants from './components/NearbyRestaurants';

// Moved from types.ts to resolve a build error
interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const App: React.FC = () => {
  // Config and Initialization State
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password' | 'reset_password'>('login');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Guest Allergy State
  const [guestAllergies, setGuestAllergies] = useState<string>('');

  // Core App State
  const [menuText, setMenuText] = useState<string>('');
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [menuUrl, setMenuUrl] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysisTarget, setAnalysisTarget] = useState<string | null>(null);
  const [analysisInputType, setAnalysisInputType] = useState<AnalysisInputType>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Nearby Restaurants State
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [isFindingRestaurants, setIsFindingRestaurants] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Results State
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [searchGroundingSources, setSearchGroundingSources] = useState<GroundingSource[] | null>(null);
  const [menuContextForSuggestions, setMenuContextForSuggestions] = useState<{ text: string; url: string } | null>(null);

  // Chat State
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[] | null>(null);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Auto-analysis trigger
  const [autoAnalysisTrigger, setAutoAnalysisTrigger] = useState<number>(0);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentAllergies = currentUser?.allergies || guestAllergies;
  const currentPreferences = currentUser?.is_pro ? (currentUser?.preferences || '') : '';

  // Step 1: Fetch config and initialize services on load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const response = await fetch('/.netlify/functions/config');
        if (!response.ok) {
          let serverMessage = `Server responded with status ${response.status}.`;
          try {
            const errorBody = await response.json();
            if (errorBody.error) {
              serverMessage = errorBody.error;
            }
          } catch (e) {
            // Ignore if body isn't JSON
          }
          throw new Error(`Could not load app configuration. ${serverMessage}`);
        }
        const config: AppConfig = await response.json();
        setAppConfig(config);
        initSupabase(config.supabaseUrl, config.supabaseAnonKey);
        const supabase = getSupabaseClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              setAuthMode('reset_password');
              setIsAuthModalOpen(true);
            } else if (session?.user) {
              const userProfile = await authService.getUserProfile(session.user);
              setCurrentUser(userProfile);
              if (event === 'SIGNED_IN') {
                setIsAuthModalOpen(false);
              }
            } else if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
            }
          }
        );

        setGuestAllergies(authService.loadGuestAllergies());
        setInitError(null);

        return () => subscription?.unsubscribe();
      } catch (err) {
        console.error('Initialization failed:', err);
        setInitError(err instanceof Error ? err.message : 'A critical error occurred.');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!currentAllergies.trim()) {
      setError('Please list your allergies first.');
      return;
    }
    if (!menuText.trim() && !menuImage && !menuUrl.trim()) {
      setError('Please provide a menu as text, an image, a URL, or by scanning a QR code.');
      return;
    }

    if (currentUser && !currentUser.is_pro) {
      const maxAnalyses = currentUser.max_analyses_per_month;
      if (maxAnalyses != null) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const analysesThisMonth = currentUser.analysisHistory?.filter(h => {
          const historyDate = new Date(h.created_at);
          return historyDate.getMonth() === currentMonth && historyDate.getFullYear() === currentYear;
        })?.length || 0;

        if (analysesThisMonth >= maxAnalyses) {
          setError(`You have reached your monthly analysis limit of ${maxAnalyses}. Upgrade to Pro for unlimited analyses.`);
          return;
        }
      } else {
        setError('Unable to determine your analysis limit. Please contact support.');
        return;
      }
    }

    setError(null);
    setIsLoadingAnalysis(true);
    setAnalysisResults(null);
    setAnalysisSummary(null);
    setMenuContextForSuggestions(null);
    setConversationHistory(null);
    setSearchGroundingSources(null);

    try {
      let contextText = menuText;
      let contextUrl = menuUrl;
      let target = 'Pasted Text';
      if (contextUrl.trim()) target = new URL(contextUrl).hostname;
      else if (menuImage) target = `Image: ${menuImage.name}`;

      setAnalysisTarget(target);
      setMenuContextForSuggestions({ text: contextText, url: contextUrl });
      setAnalysisInputType(menuUrl.trim() ? 'url' : menuImage ? 'image' : 'text');

      const results = await analyzeMenu(currentAllergies, currentPreferences, menuText, menuImage, menuUrl);
      setAnalysisResults(results);

      if (results.length > 0) {
        const summary = await summarizeSafeOptions(results, currentAllergies, currentPreferences);
        setAnalysisSummary(summary);
        const initialHistory = startMenuChat(currentAllergies, currentPreferences, results);
        setConversationHistory(initialHistory);

        if (currentUser) {
          const updatedUser = await authService.addAnalysisToHistory(currentUser, results, currentAllergies, currentPreferences, target);
          setCurrentUser(updatedUser);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
      if (errorMessage.includes('Monthly analysis limit exceeded')) {
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
      setAnalysisResults(null);
    } finally {
      setIsLoadingAnalysis(false);
      setAnalysisTarget(null);
    }
  }, [currentAllergies, currentPreferences, menuText, menuImage, menuUrl, currentUser]);

  useEffect(() => {
    if (autoAnalysisTrigger > 0) handleAnalyze();
  }, [autoAnalysisTrigger, handleAnalyze]);

  const handleFindNearby = useCallback(async () => {
    setLocationError(null);
    setIsFindingRestaurants(true);
    setRestaurants(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const foundRestaurants = await findNearbyRestaurants(position.coords.latitude, position.coords.longitude);
          setRestaurants(foundRestaurants);
        } catch (err) {
          setLocationError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setIsFindingRestaurants(false);
        }
      },
      (error) => {
        setLocationError(`Geolocation error: ${error.message}. Please enable location services.`);
        setIsFindingRestaurants(false);
      },
      { timeout: 10000 }
    );
  }, []);

  const updateUserState = (user: AppUser) => {
    setCurrentUser(user);
  };
  const handleLoginClick = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };
  const handleLogout = async () => {
    if (currentUser) authService.saveGuestAllergies(currentUser.allergies || '');
    await authService.logout();
    setGuestAllergies(authService.loadGuestAllergies());
    setConversationHistory(null);
    setAnalysisResults(null);
    setShowProfileDropdown(false);
  };
  const handleLoginSuccess = (user: AppUser) => {
    updateUserState(user);
    setIsAuthModalOpen(false);
  };
  const handleManageSettings = () => {
    setIsProfileSettingsOpen(true);
    setShowProfileDropdown(false);
  };
  const handleHistoryClick = () => {
    setIsHistoryModalOpen(true);
    setShowProfileDropdown(false);
  };
  const handleHistoryUpdate = (updatedHistory: AnalysisHistoryEntry[]) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, analysisHistory: updatedHistory });
    }
  };
  const handleGetStartedClick = () => mainContentRef.current?.scrollIntoView({ behavior: 'smooth' });
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    if (restaurant.website) {
      setMenuUrl(restaurant.website);
      setRestaurants(null);
      setAutoAnalysisTrigger(Date.now());
    } else {
      alert("This restaurant doesn't have a website listed on Google. Please find the menu manually.");
    }
  };
  const handleGuestAllergiesChange = (newAllergies: string) => {
    setGuestAllergies(newAllergies);
    authService.saveGuestAllergies(newAllergies);
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleSendChatMessage = async (message: string) => {
    if (!conversationHistory) return;
    setIsChatLoading(true);
    const newUserMessage: ChatMessage = { role: 'user', content: message };
    const currentHistory = [...conversationHistory, newUserMessage];
    setConversationHistory(currentHistory);
    try {
      const responseText = await continueChat(currentHistory, message);
      const modelMessage: ChatMessage = { role: 'model', content: responseText };
      setConversationHistory((prev) => (prev ? [...prev, modelMessage] : [modelMessage]));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sorry, I encountered an error.';
      setConversationHistory((prev) =>
        prev ? [...prev, { role: 'model', content: errorMessage }] : [{ role: 'model', content: errorMessage }]
      );
    } finally {
      setIsChatLoading(false);
    }
  };
  const handleScanSuccess = (data: string | null) => {
    if (data) {
      try {
        new URL(data);
        setMenuUrl(data);
        setAutoAnalysisTrigger(Date.now());
      } catch (_) {
        setError('Scanned QR code does not contain a valid URL.');
      }
    }
    setIsScannerOpen(false);
  };

  // ... rest of file remains unchanged (using currentUser: AppUser)

  return (
    // JSX unchanged, just types updated above
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* components as before */}
    </div>
  );
};

export default App;
