
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

type AuthView = 'selector' | 'login' | 'agentSignup' | 'publicSignup' | 'forgotPassword' | 'genesis' | 'recovery';

export const AuthPage: React.FC = () => {
  const { login, agentSignup, publicMemberSignup, sendPasswordReset, isProcessingAuth, unlockSovereignSession } = useAuth();
  const [view, setView] = useState<AuthView>('selector');
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const { addToast } = useToast();

  const handleRecoveryComplete = async (m: string, p: string, data: any) => {
    try {
        await cryptoService.saveVault({ mnemonic: m }, p);
        // Explicitly unlock the session in AuthContext to transition state
        await unlockSovereignSession(data, p);
        addToast("Identity Re-Anchored.", "success");
        setView('login');
    } catch (err) {
        addToast("Re-anchor failed.", "error");
    }
  };

  const renderContent = () => {
    switch(view) {
        case 'selector':
            return (
                <div className="module-frame glass-module p-10 sm:p-16 rounded-[3rem] border-white/10 shadow-2xl flex flex-col items-center animate-fade-in max-w-md w-full relative overflow-hidden">
                    <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
                    
                    <div className="flex flex-col items-center mb-12 relative z-10">
                        <div className="w-20 h-20 bg-black rounded-2xl border border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-6">
                            <LogoIcon className="h-12 w-12 text-brand-gold" />
                        </div>
                        <h2 className="text-4xl font-black text-center text-white uppercase tracking-tighter gold-text leading-none">Access Node</h2>
                        <p className="label-caps mt-3 !text-gray-500 !tracking-[0.4em]">Protocol Authorization</p>
                    </div>
                    
                    <div className="flex flex-col gap-4 w-full relative z-10">
                        <button 
                            onClick={() => setView('login')} 
                            className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-glow-gold active:scale-95 transition-all hover:bg-brand-gold-light"
                        >
                            Connect Node (Login)
                        </button>
                        <button 
                            onClick={() => setView('genesis')} 
                            className="w-full py-6 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] hover:bg-white/10 active:scale-95 transition-all"
                        >
                            Register New Node
                        </button>
                        
                        <div className="text-center pt-6">
                            <button 
                                onClick={() => setView('recovery')} 
                                className="text-[9px] font-black uppercase text-gray-600 hover:text-brand-gold transition-colors tracking-[0.3em]"
                            >
                                Lost Node Access? Recovery
                            </button>
                        </div>
                    </div>

                    <div className="mt-12 text-center pb-2 relative z-10 border-t border-white/5 pt-8 w-full">
                        <button onClick={() => setIsPolicyVisible(true)} className="text-[8px] font-black uppercase tracking-[0.6em] text-gray-700 hover:text-brand-gold transition-colors">Privacy & Compliance Protocol</button>
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
    <div className="flex-1 flex flex-col justify-center items-center relative min-h-screen w-full overflow-hidden py-10 bg-black">
        <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
        <div className="flex-1 flex items-center justify-center z-10 w-full px-4">
            {renderContent()}
        </div>
        <PrivacyPolicyModal isOpen={isPolicyVisible} onClose={() => setIsPolicyVisible(false)} />
    </div>
  );
};
