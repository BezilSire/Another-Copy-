
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
                <div className="glass-card p-10 rounded-[3rem] border-white/10 text-center animate-fade-in space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Check your inbox</h2>
                    <p className="text-gray-400 text-sm leading-relaxed uppercase tracking-wider font-bold">
                        We've sent a recovery protocol to <strong className="text-brand-gold">{resetEmail}</strong>.
                    </p>
                    <button
                        onClick={resetFlow}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                    >
                        Back to Protocol
                    </button>
                </div>
            );
        default:
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative">
        <div className="w-full max-w-lg z-10">
            <div key={view} className="animate-fade-in">
                {renderContent()}
            </div>

            <div className="mt-12 text-center space-y-4">
                <div className="flex justify-center items-center gap-6">
                    <button onClick={() => setIsPolicyVisible(true)} className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-brand-gold transition-colors">
                        Privacy Protocol
                    </button>
                    <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                    <a href="mailto:support@globalcommons.app" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-brand-gold transition-colors">
                        Network Support
                    </a>
                </div>
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.5em]">&copy; Ubuntium G.C.N v2.5.0</p>
            </div>
        </div>

        <PrivacyPolicyModal isOpen={isPolicyVisible} onClose={() => setIsPolicyVisible(false)} />
    </div>
  );
};
