import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  AnalysisResult,
  ChatMessage,
  User,
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const updateUserState = (user: User) => {
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
  const handleLoginSuccess = (user: User) => {
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

  const showInputSection = !analysisResults && !isLoadingAnalysis && !isInitializing && !initError;
  const showWelcome = showInputSection && !currentUser;

  if (isInitializing || initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <MenuGuardLogo className="h-12 w-12 text-green-600 mb-4" />
        {isInitializing ? (
          <>
            <Spinner className="h-10 w-10 text-green-600" />
            <p className="text-lg text-gray-600 mt-4 animate-pulse">Initializing secure connection...</p>
          </>
        ) : (
          <div className="text-center max-w-lg">
            <h2 className="text-2xl font-bold text-red-700">Initialization Failed</h2>
            <p className="mt-2 text-red-600 bg-red-50 p-3 rounded-md">{initError}</p>
            <p className="mt-4 text-sm text-gray-500">
              This can happen if the application is not configured correctly on the server. Please ensure all API keys and
              environment variables are set up in the Netlify dashboard and try again.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {isScannerOpen && <QRCodeScanner onScanSuccess={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
        setMode={setAuthMode}
      />
      {currentUser && isProfileSettingsOpen && (
        <ProfileSettings
          isOpen={isProfileSettingsOpen}
          onClose={() => setIsProfileSettingsOpen(false)}
          user={currentUser}
          onUserUpdate={updateUserState}
        />
      )}
      {currentUser && isHistoryModalOpen && (
        <AnalysisHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          user={currentUser}
          onHistoryUpdate={handleHistoryUpdate}
          onUserUpdate={updateUserState}
        />
      )}

      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <MenuGuardLogo className="h-8 w-8 text-green-600" />
            <span className="ml-3 text-xl font-bold text-gray-800 tracking-tight">Menu Guard</span>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div ref={profileRef} className="relative">
                <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100">
                  <UserIcon className="w-6 h-6 text-gray-600" />
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 origin-top-right">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900 truncate">{currentUser.username || 'Guest'}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email || 'No email'}</p>
                        <p className={`mt-1 text-xs font-semibold ${currentUser.is_pro ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {currentUser.is_pro ? 'Pro Member' : 'Standard Member'}
                        </p>
                      </div>
                      <button
                        onClick={handleManageSettings}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={handleHistoryClick}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Analysis History
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center text-sm font-semibold text-green-600 hover:text-green-800 transition-colors"
              >
                <LoginIcon className="w-5 h-5 mr-1.5" />
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={mainContentRef} className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {isLoadingAnalysis && (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <Spinner className="h-12 w-12 text-green-600" />
              <p className="text-lg text-gray-600 animate-pulse">
                {analysisTarget ? `Analyzing ${analysisTarget}...` : 'Analyzing...'}
              </p>
            </div>
          )}

          {showInputSection && (
            <>
              {showWelcome && <WelcomeHero onGetStartedClick={handleGetStartedClick} />}
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md space-y-8">
                <div>
                  {currentUser ? (
                    <UserSettingsDisplay user={currentUser} onEditClick={handleManageSettings} />
                  ) : (
                    <AllergyInput allergies={guestAllergies} setAllergies={handleGuestAllergiesChange} />
                  )}
                </div>
                <hr />
                <MenuInput
                  menuText={menuText}
                  setMenuText={setMenuText}
                  setMenuImage={setMenuImage}
                  menuUrl={menuUrl}
                  setMenuUrl={setMenuUrl}
                  onScanClick={() => setIsScannerOpen(true)}
                  onFindNearbyClick={handleFindNearby}
                  isFindingNearby={isFindingRestaurants}
                />
                <div className="pt-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoadingAnalysis}
                    className="w-full flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-wait"
                  >
                    {isLoadingAnalysis ? (
                      <>
                        <Spinner className="-ml-1 mr-3 h-5 w-5 text-white" />
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Menu'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          <NearbyRestaurants
            isLoading={isFindingRestaurants}
            error={locationError}
            restaurants={restaurants}
            onSelectRestaurant={handleSelectRestaurant}
          />

          {error && (
            <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center" role="alert">
              <div>
                <strong className="font-bold">Error: </strong>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="p-1 text-red-700 hover:text-red-900" aria-label="Dismiss error">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {analysisResults && (
            <div className="mt-8 space-y-8">
              <ResultsDisplay
                results={analysisResults}
                analysisSummary={analysisSummary}
                searchGroundingSources={searchGroundingSources}
                menuContext={menuContextForSuggestions}
                currentAllergies={currentAllergies}
                currentPreferences={currentPreferences}
                analysisInputType={analysisInputType}
              />
              {conversationHistory && (
                <ChatInterface conversation={conversationHistory.slice(1)} onSendMessage={handleSendChatMessage} isLoading={isChatLoading} />
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white mt-16 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            <InfoIcon className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
            Menu Guard is an AI-powered tool. Always double-check with the restaurant staff before ordering.
          </p>
          <p className="text-xs">&copy; {new Date().getFullYear()} Menu Guard. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;