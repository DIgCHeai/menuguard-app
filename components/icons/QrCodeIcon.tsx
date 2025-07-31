import React from 'react';

export const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 00-.75.75v13.5a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h.008v.008H7.5V15zm0-3.75h.008v.008H7.5v-.008zm0-3.75h.008v.008H7.5V7.5zm3.75 3.75h.008v.008h-.008v-.008zm0-3.75h.008v.008h-.008V7.5zm3.75 7.5h.008v.008h-.008V15zm-3.75-3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008V15zm3.75 0h.008v.008h-.008V15zm0-3.75h.008v.008h-.008v-.008zm0-3.75h.008v.008h-.008V7.5z" />
    </svg>
);