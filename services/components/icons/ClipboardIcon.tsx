
import React from 'react';

export const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.045M15.666 3.888C15.989 3.47 16.5 3 17.25 3h.001c.75 0 1.26.47 1.584.888M15.666 3.888a2.25 2.25 0 00-1.584-.888h-1.332c-.523 0-.982.24-1.287.63M19.5 7.5v10.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V7.5" />
    </svg>
);