import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { User } from '../types';
import * as authService from '../services/authService';
import { XCircleIcon } from './icons/XCircleIcon';
import { TermsOfService, PrivacyPolicy } from './Legal';
import { LeafIcon } from './icons/LeafIcon';

type AuthMode = 'login' | 'signup' | 'forgot_password' | 'reset_password';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
    initialMode: AuthMode;
    setMode: (mode: AuthMode) => void;
}

// Helper to validate password
const validatePassword = (password: string) => {
    return {
        minLength: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
};

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => {
    const Icon = isValid ? LeafIcon : XCircleIcon;
    const colorClass = isValid ? 'text-green-600' : 'text-gray-400';

    return (
        <li className={`flex items-center text-sm ${colorClass} transition-colors duration-300`}>
            <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{text}</span>
        </li>
    );
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialMode, setMode }) => {
    const [mode, setInternalMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
    });
    
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInternalMode(initialMode);
        // Reset state when modal opens or mode changes
        setError(null);
        setMessage(null);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAgreedToTerms(false);
        setPasswordValidity(validatePassword(''));
    }, [isOpen, initialMode]);
    
    useEffect(() => {
        setPasswordValidity(validatePassword(password));
    }, [password]);

    // Accessibility: Trap focus inside the modal
    useEffect(() => {
        if (!isOpen || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };
        
        firstElement?.focus();
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);

        try {
            if (mode === 'signup') {
                if (password !== confirmPassword) throw new Error("Passwords do not match.");
                if (!agreedToTerms) throw new Error("You must agree to the terms and privacy policy.");
                const validity = validatePassword(password);
                if (!Object.values(validity).every(v => v)) {
                    throw new Error("Password does not meet all requirements.");
                }
                // The new signup flow is decoupled. It just creates the user.
                await authService.signup(email, password);
                setMessage("Account created! Please check your email for a verification link.");
            } else if (mode === 'login') {
                const user = await authService.login(email, password);
                onLoginSuccess(user);
            } else if (mode === 'forgot_password') {
                await authService.requestPasswordReset(email);
                setMessage("If an account with that email exists, a password reset link has been sent to it.");
            } else if (mode === 'reset_password') {
                if (password !== confirmPassword) throw new Error("Passwords do not match.");
                const validity = validatePassword(password);
                if (!Object.values(validity).every(v => v)) {
                    throw new Error("Password does not meet all requirements.");
                }
                const user = await authService.resetPassword(password);
                setMessage("Password successfully reset! You are now logged in.");
                setTimeout(() => onLoginSuccess(user), 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setInternalMode(newMode);
        setError(null);
        setMessage(null);
    }

    const getTitle = () => {
        switch(mode) {
            case 'login': return 'Login to your Account';
            case 'signup': return 'Create an Account';
            case 'forgot_password': return 'Forgot Password';
            case 'reset_password': return 'Reset Your Password';
        }
    }

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onMouseDown={onClose}>
            <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
                <div className="p-6 sm:p-8">
                    <div className="flex justify-between items-start">
                        <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close authentication modal"><XCircleIcon className="w-7 h-7" /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
                        {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{message}</div>}

                        {mode === 'login' && (
                             <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900" />
                            </div>
                        )}
                        
                        {(mode === 'signup' && !message) && (
                            <div>
                                <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700">Email address</label>
                                <input id="email-signup" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900" />
                            </div>
                        )}
                        
                        {(mode === 'forgot_password' && !message) && (
                             <div>
                                <label htmlFor="email-forgot" className="block text-sm font-medium text-gray-700">Email address</label>
                                <input id="email-forgot" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900" />
                            </div>
                        )}


                        { (mode === 'login' || mode === 'signup' || mode === 'reset_password') && !message && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">{mode === 'reset_password' ? 'New Password' : 'Password'}</label>
                                <input id="password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900" />
                                 {(mode === 'signup' || mode === 'reset_password') && (
                                    <ul className="mt-2 space-y-1 pl-1">
                                        <PasswordRequirement isValid={passwordValidity.minLength} text="At least 8 characters" />
                                        <PasswordRequirement isValid={passwordValidity.hasLower} text="A lowercase letter (a-z)" />
                                        <PasswordRequirement isValid={passwordValidity.hasUpper} text="An uppercase letter (A-Z)" />
                                        <PasswordRequirement isValid={passwordValidity.hasNumber} text="A number (0-9)" />
                                        <PasswordRequirement isValid={passwordValidity.hasSpecial} text="A special character (!@#...)" />
                                    </ul>
                                )}
                            </div>
                        )}

                        {(mode === 'signup' || mode === 'reset_password') && !message && (
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">{mode === 'reset_password' ? 'Confirm New Password' : 'Confirm Password'}</label>
                                <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900" />
                            </div>
                        )}
                        
                        {mode === 'login' && (
                             <div className="text-right">
                                <button type="button" onClick={() => switchMode('forgot_password')} className="text-sm font-medium text-green-600 hover:text-green-500">
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        {mode === 'signup' && !message && (
                            <div className='space-y-3 pt-2'>
                                <TermsOfService />
                                <PrivacyPolicy />
                                <div className="flex items-start">
                                    <input id="terms" name="terms" type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5" />
                                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">I have read and agree to the Terms of Service and Privacy Policy.</label>
                                </div>
                            </div>
                        )}

                        {!message && (
                          <div>
                              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400">
                                  {isLoading ? 'Processing...' : (mode === 'login' ? 'Login' : (mode === 'signup' ? 'Sign Up' : 'Submit'))}
                              </button>
                          </div>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                             {mode === 'login' && "Don't have an account?"}
                             {mode === 'signup' && "Already have an account?"}
                             {(mode === 'forgot_password' || mode === 'reset_password') && "Remembered your password?"}
                             <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-medium text-green-600 hover:text-green-500 ml-1">
                                {mode === 'login' ? 'Sign up' : 'Login'}
                             </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? ReactDOM.createPortal(modalContent, modalRoot) : null;
};

export default AuthModal;