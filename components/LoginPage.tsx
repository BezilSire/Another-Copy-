import React, { useState } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

type LoginCredentials = {
  email: string;
  password?: string;
};

interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  isProcessing: boolean;
  onSwitchToSignup: () => void;
  onSwitchToPublicSignup: () => void;
  onSwitchToForgotPassword: () => void;
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isProcessing, onSwitchToSignup, onSwitchToPublicSignup, onSwitchToForgotPassword, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/10 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
      <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
      
      <button onClick={onBack} className="absolute top-8 left-8 text-white/40 hover:text-white transition-all">
          <ArrowLeftIcon className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center mb-10 relative z-10 pt-4">
        <div className="w-16 h-16 bg-black rounded-2xl border border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-6">
            <LogoIcon className="h-10 w-10 text-brand-gold" />
        </div>
        <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none">Handshake</h2>
        <p className="label-caps mt-2 !text-brand-gold">Identity Verification</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label className="label-caps pl-1" htmlFor="email">
            Identity Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all placeholder-slate-800 data-mono uppercase"
            placeholder="NODE@PROTOCOL.ORG"
            required
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <label className="label-caps" htmlFor="password">
                Security Anchor
              </label>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-brand-gold transition-colors"
              >
                Lost Key?
              </button>
          </div>
          <div className="relative group">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base pr-14 focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all placeholder-slate-800"
              placeholder="••••••••••••"
              required
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

        <button
          type="submit"
          className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[11px] mt-4 flex justify-center items-center gap-3"
          disabled={isProcessing}
        >
          {isProcessing ? "Verifying..." : "Authorize Entry"}
        </button>
      </form>

      <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-6 relative z-10">
          <button
            type="button"
            onClick={onSwitchToPublicSignup}
            className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors text-center"
          >
            New Citizen? Create Node Access
          </button>
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-gray-400 transition-colors text-center"
          >
            Facilitator Node Registration
          </button>
      </div>
    </div>
  );
};