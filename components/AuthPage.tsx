import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { Member } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { MemberLookup } from './MemberLookup';
import { MemberSignupForm } from './MemberSignupForm';
import { MemberActivationForm } from './MemberActivationForm';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';

type AuthView = 'login' | 'agentSignup' | 'forgotPassword' | 'lookup' | 'memberSignup' | 'memberActivate' | 'passwordResetSent';

export const AuthPage: React.FC = () => {
  const { login, agentSignup, memberSignup, memberActivate, sendPasswordReset } = useAuth();
  const { addToast } = useToast();
  
  const [view, setView] = useState<AuthView>('login');
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const [lookupData, setLookupData] = useState<{ email: string; member: Member | null } | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');

  // This effect handles invalid states, e.g., on page refresh, preventing render loops.
  useEffect(() => {
    if ((view === 'memberSignup' || view === 'memberActivate') && !lookupData) {
      setView('lookup');
    }
  }, [view, lookupData]);

  const handlePasswordReset = async (email: string) => {
    await sendPasswordReset(email);
    setResetEmail(email);
    setView('passwordResetSent');
  };

  const handleMemberLookup = async (email: string) => {
    try {
        setLookupMessage(null);
        const member = await api.getMemberByEmail(email);
        setLookupData({ email, member });
        if (member) {
            if (member.uid) {
                setLookupMessage(`An account for ${email} already exists. Please log in.`);
                setView('lookup'); // Stay on lookup but show message
            } else {
                setView('memberActivate');
            }
        } else {
            setView('memberSignup');
        }
    } catch (error) {
        console.error("Member lookup failed:", error);
        const firebaseError = error as { code?: string; message?: string };
        let message = 'An error occurred during lookup. Please try again.';

        if (firebaseError.code === 'failed-precondition') {
            message = 'Lookup failed. A database index is required. Please contact an administrator to resolve this.';
        } else if (firebaseError.code === 'permission-denied') {
            message = 'Lookup failed due to a permissions issue. Please contact an administrator to resolve this.';
        }
        
        addToast(message, 'error');
    }
  };

  const resetFlow = () => {
    setView('login');
    setLookupData(null);
    setLookupMessage(null);
    setResetEmail('');
  };
  
  const handleBackToLookup = () => {
      // Keep the email but clear the member data to allow re-lookup if needed.
      setLookupData(prev => prev ? { email: prev.email, member: null } : null);
      setView('lookup');
  }

  const renderContent = () => {
    switch(view) {
        case 'login':
            return <LoginPage onLogin={login} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => { setLookupMessage(null); setView('lookup'); }} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
        case 'agentSignup':
            return <SignupPage onSignup={agentSignup} onSwitchToLogin={resetFlow} />;
        case 'lookup':
            return <MemberLookup onLookup={handleMemberLookup} onBack={resetFlow} message={lookupMessage} />;
        case 'memberSignup':
            return lookupData ? <MemberSignupForm email={lookupData.email} onRegister={memberSignup} onBack={handleBackToLookup} /> : null;
        case 'memberActivate':
            return lookupData?.member ? <MemberActivationForm member={lookupData.member} onActivate={memberActivate} onBack={handleBackToLookup} /> : null;
        case 'forgotPassword':
            return <ForgotPasswordForm onReset={handlePasswordReset} onBack={resetFlow} />;
        case 'passwordResetSent':
            return (
                <div className="bg-slate-800 p-8 rounded-lg shadow-lg text-center animate-fade-in">
                    {/* Embedded MailIcon SVG */}
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
            return <LoginPage onLogin={login} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('lookup')} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
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
            <p>© Ubuntium Global Commons 2025. All rights reserved.</p>
        </div>

        <PrivacyPolicyModal isOpen={isPolicyVisible} onClose={() => setIsPolicyVisible(false)} />
    </div>
  );
};