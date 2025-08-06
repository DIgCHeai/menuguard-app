import React, { useState, useEffect } from 'react';

interface AllergyInputProps {
    allergies: string;
    setAllergies: (allergies: string) => void;
}

const AllergyInput: React.FC<AllergyInputProps> = ({ allergies, setAllergies }) => {
    // Use local state to avoid re-rendering the parent on every keystroke.
    // This makes the input feel more responsive and prevents layout shifts.
    const [localValue, setLocalValue] = useState(allergies);

    // Sync local state if the prop changes from the parent
    // (e.g., on initial load from localStorage or user login).
    useEffect(() => {
        setLocalValue(allergies);
    }, [allergies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    // Update the parent state only when the user is done typing in the field.
    const handleBlur = () => {
        setAllergies(localValue);
    };

    return (
        <div>
            <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
                1. What are your allergies?
            </label>
            <p className="text-xs text-gray-500 mb-2">Separate different allergies with a comma (e.g., Peanuts, Dairy, Soy).</p>
            <input
                type="text"
                id="allergies"
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., Peanuts, Shellfish, Gluten"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
            />
        </div>
    );
};

export default AllergyInput;