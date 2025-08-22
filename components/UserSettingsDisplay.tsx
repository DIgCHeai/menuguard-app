import React from 'react';
import { AppUser } from '../types';
import { PencilIcon } from './icons/PencilIcon';

interface UserSettingsDisplayProps {
  user: AppUser;
  onEditClick: () => void;
}

const UserSettingsDisplay: React.FC<UserSettingsDisplayProps> = ({ user, onEditClick }) => {
  const analysesThisMonth = user.analysisHistory.filter(h => {
    const historyDate = new Date(h.created_at);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return historyDate.getMonth() === currentMonth && historyDate.getFullYear() === currentYear;
  }).length;

  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          1. Your Profile Settings
        </label>
        <button
          onClick={onEditClick}
          className="flex items-center text-sm font-medium text-green-600 hover:text-green-800"
        >
          <PencilIcon className="w-4 h-4 mr-1" />
          Edit Settings
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Your saved allergies and preferences will be used for analysis.
      </p>
      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">Your Allergies:</p>
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-600 min-h-[40px]">
            {user.allergies || 'No allergies listed. Click "Edit Settings" to add them.'}
          </div>
        </div>
        {user.is_pro ? (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Your Dietary Preferences (Pro feature):
            </p>
            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-600 min-h-[40px]">
              {user.preferences || 'No preferences listed.'}
            </div>
          </div>
        ) : (
          user.max_analyses_per_month !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Monthly Usage:</p>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-600">
                You have used <strong>{analysesThisMonth}</strong> of your{' '}
                <strong>{user.max_analyses_per_month}</strong> free analyses this month.
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default UserSettingsDisplay;
