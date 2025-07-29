import React from 'react';
import { MenuGuardLogo } from './icons/MenuGuardLogo';

interface WelcomeHeroProps {
    onGetStartedClick: () => void;
}

const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onGetStartedClick }) => {
    return (
        <div className="text-center bg-green-50/50 border border-green-200/60 rounded-xl py-12 sm:py-16 px-6 mb-8">
            <MenuGuardLogo className="mx-auto h-16 w-16 text-green-600" />
            <h2 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-gray-800">
                Dine with Confidence.
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
                Instantly analyze any restaurant menu for allergens and dietary restrictions. Your personal guide to safe and enjoyable dining.
            </p>
            <div className="mt-8">
                <button
                    onClick={onGetStartedClick}
                    className="inline-block bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform duration-200 hover:scale-105"
                >
                    Analyze Your First Menu
                </button>
            </div>
        </div>
    );
};

export default WelcomeHero;