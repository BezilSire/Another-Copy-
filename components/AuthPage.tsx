
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
import { UploadCloudIcon } from './icons/UploadCloudIcon';
import { useToast } from '../contexts/ToastContext';

type AuthView = 'selector' | 'login' | 'agentSignup' | 'publicSignup' | 'forgotPassword' | 'genesis' | 'restore_file' | 'recovery';

export const AuthPage: React.FC = () => {
  const { login, agentSignup, publicMemberSignup, sendPasswordReset, isProcessingAuth } = useAuth();
  const [view, setView] = useState<AuthView>('selector');
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const { addToast } = useToast();

  const handleRestoreFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            if (data.mnemonic) {
                const pin = prompt("Enter a new 6-digit PIN for this session:");
                if (pin && pin.length === 6) {
                    await cryptoService.saveVault(data, pin);
                    addToast("Node Successfully Re-anchored.", "success");
                    setView('login');
                }
            } else {
                throw new Error("Invalid format");
            }
        } catch (err) {
            addToast("Identity File Corrupt.", "error");
        }
    };
    reader.readAsText(file);
  };

  const renderContent = () => {
    switch(view) {
        case 'selector':
            return (
                <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-white/10 shadow-premium animate-fade-in space-y-12 max-w-md w-full">
                    <div className="corner-tl"></div><div className="corner-br"></div>
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase gold-text leading-none">Citizenship</h2>
                        <p className="label-caps !text-[9px] !text-gray-500">Initiate Node Handshake</p>
                    </div>
                    
                    <div className="space-y-4">
                        <button onClick={() => setView('genesis')} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all">
                            New Member
                        </button>
                        <button onClick={() => setView('login')} className="w-full py-6 bg-white/5 border border-white/10 text-white font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] hover:bg-white/10 transition-all">
                            Connect Node
                        </button>
                        <button onClick={() => setView('recovery')} className="w-full py-3 text-[9px] font-black uppercase text-gray-600 hover:text-brand-gold transition-colors tracking-[0.3em]">
                            Lost Node Access? Recover
                        </button>
                    </div>
                </div>
            );
        case 'recovery':
            return <RecoveryProtocol onBack={() => setView('selector')} onComplete={async (m, p) => { await cryptoService.saveVault({mnemonic: m}, p); addToast("Identity Restored.", "success"); setView('login'); }} />;
        case 'genesis':
            return <GenesisNodeFlow onComplete={(m, p) => { cryptoService.saveVault({mnemonic: m}, p); setView('publicSignup'); }} onBack={() => setView('selector')} />;
        case 'login':
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
        case 'publicSignup':
            return <PublicRegistrationPage onRegister={publicMemberSignup} isProcessing={isProcessingAuth} onBackToLogin={() => setView('login')} />;
        case 'agentSignup':
            return <SignupPage onSignup={agentSignup} isProcessing={isProcessingAuth} onSwitchToLogin={() => setView('login')} />;
        case 'forgotPassword':
            return <ForgotPasswordForm onReset={async (email) => { await sendPasswordReset(email); setView('selector'); }} isProcessing={isProcessingAuth} onBack={() => setView('login')} />;
        default:
            return <LoginPage onLogin={login} isProcessing={isProcessingAuth} onSwitchToSignup={() => setView('agentSignup')} onSwitchToPublicSignup={() => setView('publicSignup')} onSwitchToForgotPassword={() => setView('forgotPassword')} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative bg-black">
        <div className="absolute inset-0 blueprint-grid opacity-[0.05] pointer-events-none"></div>
        <div className="w-full max-w-lg z-10 flex justify-center">
            {renderContent()}
        </div>
        <div className="mt-12 text-center space-y-4 relative z-10">
            <button onClick={() => setIsPolicyVisible(true)} className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-brand-gold">Privacy Protocol</button>
        </div>
        <PrivacyPolicyModal isOpen={isPolicyVisible} onClose={() => setIsPolicyVisible(false)} />
    </div>
  );
};
