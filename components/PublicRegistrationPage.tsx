
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
    } else if (name === 'email') {
        setFormData(prev => ({ ...prev, [name]: value.toLowerCase().trim() }));
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
    <div className="module-frame glass-module p-8 sm:p-12 rounded-[2.5rem] border-white/10 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8 pt-4">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-brand-gold/30 flex items-center justify-center mb-6 shadow-lg">
                <LogoIcon className="h-10 w-10 text-brand-gold" />
            </div>
            <h2 className="text-3xl font-bold text-center text-white leading-none">Join the Network</h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">Create your community profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 pl-1" htmlFor="full_name">Full Name</label>
                <input 
                    type="text" 
                    name="full_name" 
                    id="full_name" 
                    value={formData.full_name} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-5 text-white font-medium" 
                    placeholder="First Last"
                    disabled={isProcessing}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 pl-1" htmlFor="email">Email Address</label>
                <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-5 text-white font-medium lowercase" 
                    placeholder="yourname@gmail.com"
                    disabled={isProcessing}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 pl-1" htmlFor="password">Create Password</label>
                <div className="relative">
                    <input
                        id="password"
                        type={isPasswordVisible ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-5 text-white font-medium pr-12"
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        disabled={isProcessing}
                    />
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible((prev) => !prev)}
                        className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-brand-gold transition-colors"
                    >
                        {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>
            </div>
            
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 pl-1" htmlFor="referralCode">Referral Code (Optional)</label>
                <input 
                    type="text" 
                    name="referralCode" 
                    id="referralCode" 
                    value={formData.referralCode} 
                    onChange={handleChange} 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-5 text-white font-bold" 
                    placeholder="CODE-XXXXX"
                    disabled={isProcessing}
                />
            </div>
            
            <div className="flex flex-col gap-3 pt-4">
                <button 
                    type="submit" 
                    disabled={isProcessing} 
                    className="w-full py-4 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 text-sm"
                >
                    {isProcessing ? 'Registering...' : 'Sign Up'}
                </button>
                <button
                    type="button"
                    onClick={onBackToLogin}
                    disabled={isProcessing}
                    className="text-xs font-bold text-slate-500 hover:text-white transition-colors py-2 text-center"
                >
                    Already have an account? Log In
                </button>
            </div>
        </form>
    </div>
  );
};
