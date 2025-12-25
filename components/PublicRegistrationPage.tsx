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
    if (password.length < 6) return;
    await onRegister(formData, password).catch(() => {});
  };
  
  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/10 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
        <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>

        <div className="flex flex-col items-center mb-8 relative z-10 pt-4">
            <div className="w-16 h-16 bg-black rounded-xl border border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-6">
                <LogoIcon className="h-10 w-10 text-brand-gold" />
            </div>
            <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none">Citizen</h2>
            <p className="label-caps mt-2 !text-brand-gold">Protocol Induction</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
                <label className="label-caps pl-1" htmlFor="full_name">Full Designation</label>
                <input 
                    type="text" 
                    name="full_name" 
                    id="full_name" 
                    value={formData.full_name} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="ENTER FULL NAME"
                    disabled={isProcessing}
                />
            </div>
            <div className="space-y-2">
                <label className="label-caps pl-1" htmlFor="email">Comms Address</label>
                <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="EMAIL@PROTOCOL.ORG"
                    disabled={isProcessing}
                />
            </div>
            <div className="space-y-2">
                <label className="label-caps pl-1" htmlFor="password">Security Anchor</label>
                <div className="relative">
                    <input
                        id="password"
                        type={isPasswordVisible ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base pr-12 focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all"
                        placeholder="MIN. 6 CHARACTERS"
                        required
                        minLength={6}
                        disabled={isProcessing}
                    />
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible((prev) => !prev)}
                        className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-brand-gold transition-colors"
                    >
                        {isPasswordVisible ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                    </button>
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="label-caps pl-1" htmlFor="referralCode">Referral Node (Optional)</label>
                <input 
                    type="text" 
                    name="referralCode" 
                    id="referralCode" 
                    value={formData.referralCode} 
                    onChange={handleChange} 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all data-mono" 
                    placeholder="CODE-XXXXX"
                    disabled={isProcessing}
                />
            </div>
            
            <div className="flex flex-col gap-4 pt-4">
                <button 
                    type="submit" 
                    disabled={isProcessing} 
                    className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[11px]"
                >
                    {isProcessing ? 'SYNCHRONIZING...' : 'Initiate Node Entry'}
                </button>
                <button
                    type="button"
                    onClick={onBackToLogin}
                    disabled={isProcessing}
                    className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors py-2 text-center"
                >
                    Return to Handshake
                </button>
            </div>
        </form>
    </div>
  );
};