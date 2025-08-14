// components/ProfileManager.tsx
import React, { useState } from 'react';
import authService from '../services/authService'; // adjust path as needed

const ProfileSettings = ({ onUserUpdate, onClose }) => {
  const [username, setUsername] = useState('');
  const [allergies, setAllergies] = useState('');
  const [preferences, setPreferences] = useState('');
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!username?.trim() || !allergies?.trim()) {
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

  return (
    <div>
      {/* Add your form UI here */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
};

export default ProfileSettings;