
import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { GenesisNodeFlow } from './GenesisNodeFlow';
import { RecoveryProtocol } from './RecoveryProtocol';
import { useAuth } from '../contexts/AuthContext';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { PublicRegistrationPage } from './PublicRegistrationPage';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { LogoIcon } from './icons/LogoIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

type AuthView = 'selector' | 'login' | 'agentSignup' | 'publicSignup' | 'forgotPassword' | 'genesis' | 'recovery';

export const AuthPage: React.FC = () => {
  const { login, agentSignup, publicMemberSignup, sendPasswordReset, isProcessingAuth, unlockSovereignSession } = useAuth();
  const [view, setView] = useState<AuthView>('selector');
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const { addToast } = useToast();

  const handleRecoveryComplete = async (m: string, p: string, data: any) => {
    try {
        await cryptoService.saveVault({ mnemonic: m }, p);
        await unlockSovereignSession(data, p);
        addToast("Account access restored.", "success");
        setView('login');
    } catch (err) {
        addToast("Restoration failed.", "error");
    }
  };

  const renderContent = () => {
    switch(view) {
        case 'selector':
            return (
                <div className="module-frame glass-module p-10 sm:p-16 rounded-[3rem] border-white/10 shadow-2xl flex flex-col items-center animate-fade-in max-w-md w-full relative overflow-hidden font-sans">
                    <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
                    
                    <div className="flex flex-col items-center mb-12 relative z-10">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-brand-gold/30 flex items-center justify-center mb-6 shadow-lg">
                            <LogoIcon className="h-10 w-10 text-brand-gold" />
                        </div>
                        <h2 className="text-4xl font-bold text-center text-white tracking-tight leading-none">Welcome</h2>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Community Hub</p>
                    </div>
                    
                    <div className="flex flex-col gap-4 w-full relative z-10">
                        <button 
                            onClick={() => setView('login')} 
                            className="w-full py-5 bg-brand-gold hover:bg-brand-goldlight text-slate-950 font-bold rounded-xl shadow-lg active:scale-95 transition-all text-sm"
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={() => setView('genesis')} 
                            className="w-full py-5 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 active:scale-95 transition-all text-sm"
                        >
                            Create New Account
                        </button>
                        
                        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
                            <button 
                                onClick={() => setView('recovery')} 
                                className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-bold text-red-500 transition-all"
                            >
                                <AlertTriangleIcon className="h-4 w-4" />
                                I Lost My Access Key
                            </button>
                            <p className="text-xs text-slate-500 text-center font-medium leading-relaxed px-4">
                                Use this if you lost your 12-word recovery phrase or forgotten your PIN.
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 text-center pb-2 relative z-10 border-t border-white/5 pt-8 w-full">
                        <button onClick={() => setIsPolicyVisible(true)} className="text-xs font-bold text-slate-600 hover:text-brand-gold transition-colors">Privacy & Guidelines</button>
                    </div>
                </div>
            );
        case 'recovery':
            return <RecoveryProtocol onBack={() => setView('selector')} onComplete={handleRecoveryComplete} />;
        case 'genesis':
            return <GenesisNodeFlow onComplete={async (m, p) => { await cryptoService.saveVault({mnemonic: m}, p); setView('publicSignup'); }} onBack={() => setView('selector')} />;
        case 'login':
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} onBack={() => setView('selector')} />;
        case 'publicSignup':
            return <PublicRegistrationPage onRegister={publicMemberSignup} isProcessing={isProcessingAuth} onBackToLogin={() => setView('login')} />;
        case 'agentSignup':
            return <SignupPage onSignup={agentSignup} isProcessing={isProcessingAuth} onSwitchToLogin={() => setView('login')} />;
        case 'forgotPassword':
            return <ForgotPasswordForm onReset={async (email) => { await sendPasswordReset(email); setView('selector'); }} isProcessing={isProcessingAuth} onBack={() => setView('login')} />;
        default:
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} onBack={() => setView('selector')} />;
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center relative min-h-screen w-full overflow-hidden py-10 bg-black font-sans">
        <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
        <div className="flex-1 flex items-center justify-center z-10 w-full px-4">
            {renderContent()}
        </div>
        <PrivacyPolicyModal isOpen={isPolicyVisible} onClose={() => setIsPolicyVisible(false)} />
    </div>
  );
};
