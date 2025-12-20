
import React, { useState, useEffect } from 'react';
import { NewPublicMemberData } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface PublicRegistrationPageProps {
  onRegister: (data: NewPublicMemberData, password: string) => Promise<void>;
  onBackToLogin: () => void;
  isProcessing: boolean;
}

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({ onRegister, onBackToLogin, isProcessing }) => {
  const [formData, setFormData] = useState<NewPublicMemberData>({
    full_name: '',
    email: '',
    referralCode: '',
  });
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'referralCode') {
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    await onRegister(formData, password).catch(() => {
        // Errors are handled by parent context
    });
  };
  
  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-lg border-white/10 relative overflow-hidden shadow-2xl animate-fade-in">
        <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
        <div className="absolute inset-0 blueprint-grid opacity-[0.08] pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="w-16 h-16 bg-black rounded-xl border border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-4">
                <LogoIcon className="h-10 w-10 text-brand-gold" />
            </div>
            <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none">Citizen Node</h2>
            <p className="label-caps mt-3 !text-brand-gold text-center">Protocol Induction</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-1.5">
                <label className="label-caps block pl-1 !text-white" htmlFor="full_name">Full Designation</label>
                <input 
                    type="text" 
                    name="full_name" 
                    id="full_name" 
                    value={formData.full_name} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-slate-950/90 border border-white/20 rounded-lg py-3.5 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-slate-500" 
                    placeholder="ENTER FULL NAME"
                    disabled={isProcessing}
                />
            </div>
            <div className="space-y-1.5">
                <label className="label-caps block pl-1 !text-white" htmlFor="email">Comms Address</label>
                <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-slate-950/90 border border-white/20 rounded-lg py-3.5 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-slate-500" 
                    placeholder="EMAIL@PROTOCOL.ORG"
                    disabled={isProcessing}
                />
            </div>
            <div className="space-y-1.5">
                <label className="label-caps block pl-1 !text-white" htmlFor="password">Security Anchor</label>
                <div className="relative">
                    <input
                        id="password"
                        type={isPasswordVisible ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/90 border border-white/20 rounded-lg py-3.5 px-6 text-white text-base pr-12 focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-slate-500"
                        placeholder="MIN. 6 CHARACTERS"
                        required
                        minLength={6}
                        disabled={isProcessing}
                    />
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible((prev) => !prev)}
                        className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-brand-gold transition-colors"
                    >
                        {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>
            </div>
            
            <div className="space-y-1.5">
                <label className="label-caps block pl-1 !text-white" htmlFor="referralCode">Referral Node (Optional)</label>
                <input 
                    type="text" 
                    name="referralCode" 
                    id="referralCode" 
                    value={formData.referralCode} 
                    onChange={handleChange} 
                    className="w-full bg-slate-950/90 border border-white/20 rounded-lg py-3.5 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-slate-500 data-mono" 
                    placeholder="CODE-XXXXX"
                    disabled={isProcessing}
                />
            </div>
            
            <div className="flex flex-col gap-4 pt-4">
                <button 
                    type="submit" 
                    disabled={isProcessing} 
                    className="w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-black font-black rounded-lg transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[11px]"
                >
                    {isProcessing ? 'SYNCHRONIZING...' : 'Initiate Node Entry'}
                </button>
                <button
                    type="button"
                    onClick={onBackToLogin}
                    disabled={isProcessing}
                    className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-colors py-2"
                >
                    Return to Handshake
                </button>
            </div>
        </form>
    </div>
  );
};
