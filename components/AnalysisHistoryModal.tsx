
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { User, AnalysisHistoryEntry } from '../types';
import * as authService from '../services/authService';
import { XCircleIcon } from './icons/XCircleIcon';
import ResultsDisplay from './ResultsDisplay';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface AnalysisHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const HistoryItem: React.FC<{ item: AnalysisHistoryEntry }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    const date = new Date(item.created_at).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <div className="flex-grow">
                    <p className="font-semibold text-gray-800">{item.input_text}</p>
                    <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center">
                        <span>Allergies: <span className="font-medium">{item.allergies}</span></span>
                        {item.preferences && <span className="mx-2 text-gray-300">|</span>}
                        {item.preferences && <span>Preferences: <span className="font-medium">{item.preferences}</span></span>}
                    </p>
                     <p className="text-xs text-gray-400 mt-1">
                        Analyzed on {date}
                    </p>
                </div>
                <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-200 text-gray-500 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-white border-t border-gray-200">
                    <ResultsDisplay
                        results={item.result}
                        menuContext={null}
                        currentAllergies={item.allergies}
                        currentPreferences={item.preferences}
                        analysisInputType={null}
                    />
                </div>
            )}
        </div>
    );
}

export const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({ isOpen, onClose, user }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
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
    
    // Pro upgrade logic remains as a user benefit, but doesn't modify data in this modal.
    const handleUpgrade = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const { checkoutUrl } = await authService.initiateProUpgrade();
            alert(`In a real application, you would be redirected to:\n${checkoutUrl}\n\nFor this demo, we'll assume the upgrade is successful and refresh the page to reflect the new status.`);
            // A real app might use websockets or polling to update status, but reload is fine for demo.
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not process upgrade.");
        } finally {
            setIsSaving(false);
        }
    }
    
    const sortedHistory = user.analysisHistory?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];


    const modalContent = (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onMouseDown={onClose}>
            <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 id="history-modal-title" className="text-2xl font-bold text-gray-900">Analysis History</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close analysis history"><XCircleIcon className="w-7 h-7" /></button>
                    </div>

                    {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

                    {user.is_pro ? (
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                           {sortedHistory.length > 0 ? (
                                sortedHistory.map(item => <HistoryItem key={item.id} item={item} />)
                           ) : (
                                <div className="text-center p-8 bg-gray-50 rounded-lg">
                                    <p className="text-gray-600">You have no saved analyses yet.</p>
                                    <p className="text-sm text-gray-500">Your history will appear here after you analyze a menu.</p>
                                </div>
                           )}
                        </div>
                    ) : (
                        <div className="mt-6 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg text-center">
                            <h4 className="text-xl font-bold text-yellow-800">Unlock Your Dining History</h4>
                            <p className="mt-2 text-yellow-700">Never forget what was safe to eat at your favorite restaurants. Upgrade to Pro to automatically save every menu analysis to your account.</p>
                             <button onClick={handleUpgrade} disabled={isSaving} className="mt-4 font-bold text-white bg-yellow-500 px-6 py-2 rounded-lg hover:bg-yellow-600 disabled:bg-gray-400">
                                {isSaving ? 'Processing...' : 'Go Pro Now'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? ReactDOM.createPortal(modalContent, modalRoot) : null;
};