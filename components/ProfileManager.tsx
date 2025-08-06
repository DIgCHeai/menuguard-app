import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { User } from '../types';
import * as authService from '../services/authService';
import { XCircleIcon } from './icons/XCircleIcon';

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUserUpdate: (user: User) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
    const [username, setUsername] = useState(user.username);
    const [allergies, setAllergies] = useState(user.allergies);
    const [preferences, setPreferences] = useState(user.preferences);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setUsername(user.username);
            setAllergies(user.allergies);
            setPreferences(user.preferences);
            setError(null);
        }
    }, [isOpen, user]);

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

    const handleSave = async () => {
        if (!username.trim() || !allergies.trim()) {
            setError("Username and allergies cannot be empty.");
            return;
        }
        setError(null);
        setIsSaving(true);
        try {
            const updatedUser = await authService.updateUser({ username, allergies, preferences });
            onUserUpdate(updatedUser);
            onClose(); // Close on successful save
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const modalContent = (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onMouseDown={onClose}>
            <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-settings-title">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h2 id="profile-settings-title" className="text-2xl font-bold text-gray-900">Profile Settings</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close profile settings">
                            <XCircleIcon className="w-7 h-7" />
                        </button>
                    </div>
                    
                    {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Allergies</label>
                            <p className="text-xs text-gray-500">Separate different allergies with a comma.</p>
                            <textarea
                                value={allergies}
                                onChange={(e) => setAllergies(e.target.value)}
                                rows={3}
                                placeholder="e.g., Peanuts, Dairy, Soy"
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900"
                            />
                        </div>
                        {user.is_pro ? (
                            <div>
                                <label className="text-sm font-medium text-gray-700">Dietary Preferences <span className="text-xs font-bold text-yellow-500">(Pro)</span></label>
                                 <p className="text-xs text-gray-500">e.g., Vegan, Keto, Gluten-Free</p>
                                <input
                                    type="text"
                                    value={preferences}
                                    onChange={(e) => setPreferences(e.target.value)}
                                    placeholder="e.g., Vegan, Keto, Gluten-Free"
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900"
                                />
                            </div>
                        ) : (
                             <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                                <b>Upgrade to Pro</b> to add dietary preferences (like Vegan or Keto) for more personalized analysis!
                             </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                         <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-400">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? ReactDOM.createPortal(modalContent, modalRoot) : null;
};

export default ProfileSettings;