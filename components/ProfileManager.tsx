const handleSave = async () => {
  // Check for null/undefined and empty string after trim
  if (!username || (username && !username.trim()) || !allergies || (allergies && !allergies.trim())) {
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