import React from 'react';

export const TermsOfService: React.FC = () => (
    <div className="prose prose-sm max-w-none text-gray-500 h-32 overflow-y-auto p-2 border rounded-md">
        <h4>Terms of Service (Placeholder)</h4>
        <p>
            Welcome to Menu Guard. By using our service, you agree to these terms. This service is provided for informational purposes only.
            The analysis is performed by an AI and may not be 100% accurate. You are responsible for your own health and safety.
        </p>
        <p>
            You must always confirm allergy information with restaurant staff before ordering or consuming any food. We are not liable for any
            adverse reactions or health issues. We do not guarantee the accuracy, completeness, or usefulness of any information on the service.
        </p>
        <p>
            We reserve the right to modify or terminate the service at any time.
        </p>
    </div>
);

export const PrivacyPolicy: React.FC = () => (
    <div className="prose prose-sm max-w-none text-gray-500 h-32 overflow-y-auto p-2 border rounded-md">
        <h4>Privacy Policy (Placeholder)</h4>
        <p>
            This policy explains how we handle your data. When you create an account, we store your email and your saved allergy profile.
            This information is used to provide you with a personalized experience.
        </p>
        <p>
            We do not sell your personal data to third parties. We take reasonable measures to protect your information but cannot guarantee
            its absolute security. Menu analysis history may be saved to improve your future experience with the app.
        </p>
    </div>
);