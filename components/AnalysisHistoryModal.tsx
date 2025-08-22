import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AppUser, AnalysisHistoryEntry } from '../types'; // ✅ use AppUser now
import * as authService from '../services/authService';
import { XCircleIcon } from './icons/XCircleIcon';
import ResultsDisplay from './ResultsDisplay';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { TrashIcon } from './icons/TrashIcon';
import Spinner from './Spinner';

interface AnalysisHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser; // ✅ refactored
  onHistoryUpdate: (updatedHistory: AnalysisHistoryEntry[]) => void;
  onUserUpdate: (user: AppUser) => void; // ✅ refactored
}

const HistoryItem: React.FC<{
  item: AnalysisHistoryEntry;
  onDelete: (id: number) => void;
  deletingId: number | null;
}> = ({ item, onDelete, deletingId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const date = new Date(item.created_at).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isDeletingThisItem = deletingId === item.id;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    onDelete(item.id);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center p-4 text-left">
        <div
          className="flex-grow cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <p className="font-semibold text-gray-800">{item.input_text}</p>
          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center">
            <span>
              Allergies: <span className="font-medium">{item.allergies}</span>
            </span>
            {item.preferences && (
              <>
                <span className="mx-2 text-gray-300">|</span>
                <span>
                  Preferences:{' '}
                  <span className="font-medium">{item.preferences}</span>
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">Analyzed on {date}</p>
        </div>

        <div className="flex-shrink-0 flex items-center ml-4">
          <button
            onClick={handleDeleteClick}
            disabled={isDeletingThisItem || !!deletingId}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-full disabled:text-gray-300 disabled:cursor-not-allowed"
            aria-label="Delete analysis"
          >
            {isDeletingThisItem ? (
              <Spinner className="w-5 h-5 text-red-500" />
            ) : (
              <TrashIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 ml-1 text-gray-500"
            aria-expanded={isOpen}
          >
            <ChevronDownIcon
              className={`w-6 h-6 transform transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

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
};

export const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
  isOpen,
  onClose,
  user,
  onHistoryUpdate,
  onUserUpdate,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Accessibility: Trap focus inside the modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
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

  const handleDelete = async (idToDelete: number) => {
    if (deletingId) return; // Prevent multiple deletions at once

    if (
      !window.confirm(
        'Are you sure you want to permanently delete this analysis? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeletingId(idToDelete);
    setError(null);
    try {
      await authService.deleteAnalysisFromHistory(idToDelete);
      const updatedHistory = user.analysisHistory.filter(
        (item) => item.id !== idToDelete
      );
      onHistoryUpdate(updatedHistory);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete item. Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpgrade = async () => {
    setDeletingId(1); // Use deletingId as a generic "isSaving" state
    setError(null);
    try {
      await authService.initiateProUpgrade();
      const updatedUser = await authService.upgradeToPro();
      onUserUpdate(updatedUser); // ✅ now AppUser type
      alert('Upgrade successful! You now have full access to Pro features.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not process upgrade.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const sortedHistory =
    user.analysisHistory?.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [];

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2
              id="history-modal-title"
              className="text-2xl font-bold text-gray-900"
            >
              Analysis History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close analysis history"
            >
              <XCircleIcon className="w-7 h-7" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {user.is_pro ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              {sortedHistory.length > 0 ? (
                sortedHistory.map((item) => (
                  <HistoryItem
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                  />
                ))
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">
                    You have no saved analyses yet.
                  </p>
                  <p className="text-sm text-gray-500">
                    Your history will appear here after you analyze a menu.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg text-center">
              <h4 className="text-xl font-bold text-yellow-800">
                Unlock Your Dining History
              </h4>
              <p className="mt-2 text-yellow-700">
                Never forget what was safe to eat at your favorite restaurants.
                Upgrade to Pro to automatically save every menu analysis to your
                account.
              </p>
              <button
                onClick={handleUpgrade}
                disabled={!!deletingId}
                className="mt-4 font-bold text-white bg-yellow-500 px-6 py-2 rounded-lg hover:bg-yellow-600 disabled:bg-gray-400"
              >
                {deletingId ? 'Processing...' : 'Go Pro Now'}
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
