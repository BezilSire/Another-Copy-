
import React, { useState } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

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
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isProcessing, onSwitchToSignup, onSwitchToPublicSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-lg border-white/10 relative overflow-hidden group shadow-2xl">
      <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
      
      {/* Network Blueprint Grid Overlay */}
      <div className="absolute inset-0 blueprint-grid opacity-[0.08] pointer-events-none"></div>
      
      <div className="flex flex-col items-center mb-12 relative z-10">
        <div className="w-20 h-20 bg-black rounded-2xl border border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-6 group-hover:scale-105 transition-all duration-700">
            <LogoIcon className="h-12 w-12 text-brand-gold" />
        </div>
        <h2 className="text-4xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none font-sans">Ubuntium</h2>
        <p className="label-caps mt-3 !text-brand-gold">Node Handshake Protocol</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label className="label-caps block pl-1 !text-white" htmlFor="email">
            Identity Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="data-mono w-full bg-slate-950/90 border border-white/20 rounded-lg py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all placeholder-slate-500"
              placeholder="DESIGNATION@PROTOCOL.ORG"
              required
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <label className="label-caps block !text-white" htmlFor="password">
                Security Anchor
              </label>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-gold transition-colors"
              >
                Lost Anchor?
              </button>
          </div>
          <div className="relative group">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="data-mono w-full bg-slate-950/90 border border-white/20 rounded-lg py-4 px-6 text-white text-base pr-14 focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all placeholder-slate-500"
              placeholder="••••••••••••"
              required
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

        <button
          type="submit"
          className="w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-black font-black rounded-lg transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-xs mt-4 flex justify-center items-center gap-3"
          disabled={isProcessing}
        >
          {isProcessing ? (
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-black rounded-full animate-ping"></div>
                <span className="data-mono">SIGNING HANDSHAKE...</span>
             </div>
          ) : "Authorize Protocol Entry"}
        </button>
      </form>

      <div className="mt-12 pt-10 border-t border-white/10 flex flex-col gap-6 relative z-10">
          <button
            type="button"
            onClick={onSwitchToPublicSignup}
            className="w-full py-4 px-6 bg-white/5 hover:bg-brand-gold/10 border border-white/20 text-white rounded-lg transition-all text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3"
          >
            Request New Node Access
          </button>
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-colors"
          >
            Facilitator Node Registration
          </button>
      </div>
    </div>
  );
};
