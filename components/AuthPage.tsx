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

type AuthView = 'login' | 'agentSignup' | 'forgotPassword' | 'lookup' | 'memberSignup' | 'memberActivate';

export const AuthPage: React.FC = () => {
  const { login, agentSignup, memberSignup, memberActivate, sendPasswordReset } = useAuth();
  const { addToast } = useToast();
  
  const [view, setView] = useState<AuthView>('login');
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const [lookupData, setLookupData] = useState<{ email: string; member: Member | null } | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  // This effect handles invalid states, e.g., on page refresh, preventing render loops.
  useEffect(() => {
    if ((view === 'memberSignup' || view === 'memberActivate') && !lookupData) {
      setView('lookup');
    }
  }, [view, lookupData]);

  const handlePasswordReset = async (email: string) => {
    await sendPasswordReset(email);
    setView('login');
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
        addToast('An error occurred during lookup. Please try again.', 'error');
    }
  };

  const resetFlow = () => {
    setView('login');
    setLookupData(null);
    setLookupMessage(null);
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
