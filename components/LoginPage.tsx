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
    <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/20 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
      <div className="corner-tl !border-white/40"></div><div className="corner-tr !border-white/40"></div><div className="corner-bl !border-white/40"></div><div className="corner-br !border-white/40"></div>
      
      <button onClick={onBack} className="absolute top-8 left-8 text-white/60 hover:text-brand-gold transition-all">
          <ArrowLeftIcon className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center mb-10 relative z-10 pt-4">
        <div className="w-20 h-20 bg-black rounded-3xl border-2 border-brand-gold/50 flex items-center justify-center shadow-glow-gold mb-8">
            <LogoIcon className="h-12 w-12 text-brand-gold" />
        </div>
        <h2 className="text-4xl font-black text-center text-white uppercase tracking-tighter gold-text leading-none">Identity</h2>
        <p className="label-caps mt-3 !text-brand-gold !text-[10px] !tracking-[0.5em]">Protocol Authorization</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label className="label-caps pl-1 !text-white !font-black" htmlFor="email">
            Node Identity (Email)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl py-5 px-6 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all placeholder-gray-600 data-mono uppercase font-bold"
            placeholder="NODE@PROTOCOL.ORG"
            required
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <label className="label-caps !text-white !font-black" htmlFor="password">
                Security Key
              </label>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-[11px] font-black uppercase tracking-widest text-brand-gold hover:text-white transition-colors"
              >
                Reset Access?
              </button>
          </div>
          <div className="relative group">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl py-5 px-6 text-white text-base pr-16 focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all placeholder-gray-600 font-bold"
              placeholder="••••••••••••"
              required
              disabled={isProcessing}
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              className="absolute inset-y-0 right-0 px-5 flex items-center text-gray-500 hover:text-brand-gold transition-colors"
            >
              {isPasswordVisible ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[12px] mt-4 flex justify-center items-center gap-3"
          disabled={isProcessing}
        >
          {isProcessing ? "Verifying..." : "Authorize Entry"}
        </button>
      </form>

      <div className="mt-12 pt-10 border-t border-white/10 flex flex-col gap-8 relative z-10">
          <button
            type="button"
            onClick={onSwitchToPublicSignup}
            className="text-[12px] font-black uppercase tracking-[0.4em] text-white hover:text-brand-gold transition-all text-center bg-white/5 py-4 rounded-2xl border border-white/5"
          >
            Create Citizen Node
          </button>
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors text-center"
          >
            Deploy Facilitator Agent
          </button>
      </div>
    </div>
  );
};