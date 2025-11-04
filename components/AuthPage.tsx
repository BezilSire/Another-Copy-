import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { NewPublicMemberData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { PublicRegistrationPage } from './PublicRegistrationPage';

type AuthView = 'login' | 'agentSignup' | 'publicSignup' | 'forgotPassword' | 'passwordResetSent';

export const AuthPage: React.FC = () => {
  const { login, agentSignup, publicMemberSignup, sendPasswordReset, isProcessingAuth } = useAuth();
  
  const [view, setView] = useState<AuthView>('login');
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handlePasswordReset = async (email: string) => {
    await sendPasswordReset(email);
    setResetEmail(email);
    setView('passwordResetSent');
  };

  const resetFlow = () => {
    setView('login');
    setResetEmail('');
  };
  
  const renderContent = () => {
    switch(view) {
        case 'login':
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
        case 'agentSignup':
            return <SignupPage onSignup={agentSignup} isProcessing={isProcessingAuth} onSwitchToLogin={resetFlow} />;
        case 'publicSignup':
            return <PublicRegistrationPage onRegister={publicMemberSignup} isProcessing={isProcessingAuth} onBackToLogin={resetFlow} />;
        case 'forgotPassword':
            return <ForgotPasswordForm onReset={handlePasswordReset} isProcessing={isProcessingAuth} onBack={resetFlow} />;
        case 'passwordResetSent':
            return (
                <div className="bg-slate-800 p-8 rounded-lg shadow-lg text-center animate-fade-in">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-16 w-16 text-green-500 mx-auto"
                    >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <h2 className="text-2xl font-bold text-white mt-4">Check your inbox</h2>
                    <p className="text-gray-300 mt-2">
                        We've sent a password reset link to <strong className="text-green-400">{resetEmail}</strong>.
                    </p>
                    <p className="text-sm text-gray-400 mt-4">
                        Didn't receive the email? Check your spam folder, or go back to try again.
                    </p>
                    <div className="mt-6">
                        <button
                            onClick={resetFlow}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            );
        default:
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
        <div key={view} className="animate-fade-in">
            {renderContent()}
        </div>

        <div className="text-center mt-8 text-xs text-gray-500 space-y-2">
            <div className="flex justify-center items-center space-x-4">
                <button onClick={() => setIsPolicyVisible(true)} className="hover:text-gray-300 transition-colors">
                    Privacy Policy
                </button>
                <span>|</span>
                <a href="mailto:support@globalcommons.app" className="hover:text-gray-300 transition-colors">
                    Support
                </a>
            </div>
            <p>© Global Commons Network 2025. All rights reserved.</p>
        </div>

        <PrivacyPolicyModal isOpen={isPolicyVisible} onClose={() => setIsPolicyVisible(false)} />
    </div>
  );
};