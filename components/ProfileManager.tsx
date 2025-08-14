import React, { useState } from 'react';
import authService from '../services/authService';

type User = {
  username: string;
  allergies: string;
  preferences?: string;
};

type ProfileSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (user: User) => void;
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
  const [username, setUsername] = useState(user.username || '');
  const [allergies, setAllergies] = useState(user.allergies || '');
  const [preferences, setPreferences] = useState(user.preferences || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
};

export default ProfileSettings;
