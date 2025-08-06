import React, { useState, useRef, useEffect } from 'react';
import { UserIcon } from './icons/UserIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

// This would likely be moved to types.ts in a full implementation
export interface Profile {
    id: string;
    name: string;
    is_active: boolean;
    // other profile data like allergies, preferences would be here
}

interface ProfileSelectorProps {
    profiles: Profile[];
    onSelectProfile: (profileId: string) => void;
    onAddProfile: () => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profiles, onSelectProfile, onAddProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const activeProfile = profiles.find(p => p.is_active) || profiles[0];
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    if (!activeProfile) {
        return (
             <button
                onClick={onAddProfile}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-sm font-semibold text-green-600"
            >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Create Profile</span>
            </button>
        );
    }

    return (
        <div ref={wrapperRef} className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                <UserIcon className="w-6 h-6 text-gray-600" />
                <span className="font-semibold text-gray-800">{activeProfile.name}</span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 origin-top-right z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <div className="px-4 py-2 border-b border-gray-200">
                            <p className="text-sm font-medium text-gray-900">Select Profile</p>
                        </div>
                        {profiles.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => {
                                    onSelectProfile(profile.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left block px-4 py-2 text-sm ${profile.is_active ? 'font-bold text-green-700 bg-green-50' : 'text-gray-700'} hover:bg-gray-100`}
                                role="menuitem"
                            >
                                {profile.name}
                            </button>
                        ))}
                         <div className="border-t border-gray-200"></div>
                         <button
                            onClick={() => {
                                onAddProfile();
                                setIsOpen(false);
                            }}
                            className="w-full text-left flex items-center px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                            role="menuitem"
                        >
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Add New Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSelector;
