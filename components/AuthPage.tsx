import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SignupPage } from './SignupPage';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

export const AuthPage: React.FC = () => {
  const { login, isProcessingAuth, sendPasswordReset } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch (err) {}
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordReset(email);
      setIsResetMode(false);
    } catch (err) {}
  };

  if (isSignup) {
    return <SignupPage onSignup={async () => {}} isProcessing={isProcessingAuth} onSwitchToLogin={() => setIsSignup(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans">
      <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/20 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
        <div className="corner-tl !border-white/40"></div><div className="corner-tr !border-white/40"></div><div className="corner-bl !border-white/40"></div><div className="corner-br !border-white/40"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10 pt-4">
          <div className="w-16 h-16 bg-black rounded-2xl border-2 border-brand-gold/50 flex items-center justify-center shadow-glow-gold mb-6">
              <LogoIcon className="h-10 w-10 text-brand-gold" />
          </div>
          <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none">Ubuntium</h2>
          <p className="label-caps mt-2 !text-brand-gold !tracking-[0.4em] !text-[10px]">Protocol Handshake</p>
        </div>

        {isResetMode ? (
          <form onSubmit={handleReset} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="label-caps pl-1 !text-white !font-black" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-900 border-2 border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold" 
                placeholder="example@gmail.com" 
                required 
              />
            </div>
            <button
              type="submit"
              className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[12px] mt-4"
              disabled={isProcessingAuth}
            >
              Dispatch Recovery
            </button>
            <button type="button" onClick={() => setIsResetMode(false)} className="w-full text-center text-xs font-bold text-white/50 hover:text-white transition-colors uppercase tracking-widest">
              Back to Handshake
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="label-caps pl-1 !text-white !font-black" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-900 border-2 border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold" 
                placeholder="example@gmail.com" 
                required 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center pr-1">
                <label className="label-caps pl-1 !text-white !font-black" htmlFor="password">Password</label>
                <button type="button" onClick={() => setIsResetMode(true)} className="text-[9px] font-black uppercase tracking-widest text-brand-gold/60 hover:text-brand-gold transition-colors">Forgot Key?</button>
              </div>
              <div className="relative">
                <input 
                    id="password" 
                    type={isPasswordVisible ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-slate-900 border-2 border-white/10 rounded-xl py-4 px-6 text-white text-base pr-14 focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold" 
                    placeholder="your security key"
                    required 
                />
                <button type="button" onClick={() => setIsPasswordVisible((prev) => !prev)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-brand-gold transition-colors">
                  {isPasswordVisible ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[12px] mt-4"
              disabled={isProcessingAuth}
            >
              {isProcessingAuth ? "Verifying..." : "Initiate Handshake"}
            </button>

            <div className="mt-10 text-center relative z-10 border-t border-white/10 pt-8">
                <button type="button" onClick={() => setIsSignup(true)} className="text-[12px] font-black uppercase tracking-[0.4em] text-white hover:text-brand-gold transition-colors">
                  Deploy Facilitator Node
                </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
