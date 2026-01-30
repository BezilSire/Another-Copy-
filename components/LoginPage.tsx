
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
    await onLogin({ email: email.toLowerCase().trim(), password });
  };

  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-[2.5rem] border-white/20 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
      <button onClick={onBack} className="absolute top-8 left-8 text-white/60 hover:text-brand-gold transition-all">
          <ArrowLeftIcon className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center mb-10 pt-4">
        <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-brand-gold/30 flex items-center justify-center mb-6 shadow-lg">
            <LogoIcon className="h-10 w-10 text-brand-gold" />
        </div>
        <h2 className="text-3xl font-bold text-center text-white leading-none">Welcome Back</h2>
        <p className="text-slate-400 text-sm mt-2 font-medium">Log in to your community account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 pl-1" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-5 text-white focus:outline-none focus:border-brand-gold transition-all placeholder-slate-600 font-medium lowercase"
            placeholder="yourname@gmail.com"
            required
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-slate-400" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-xs font-bold text-brand-gold hover:text-white transition-colors"
              >
                Forgot?
              </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 px-5 text-white pr-12 focus:outline-none focus:border-brand-gold transition-all placeholder-slate-600 font-medium"
              placeholder="Your password"
              required
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

        <button
          type="submit"
          className="w-full py-4 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 text-sm mt-2"
          disabled={isProcessing}
        >
          {isProcessing ? "Connecting..." : "Log In"}
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-white/5 flex flex-col gap-4">
          <button
            type="button"
            onClick={onSwitchToPublicSignup}
            className="text-sm font-bold text-white hover:text-brand-gold transition-all text-center bg-white/5 py-3 rounded-xl border border-white/5"
          >
            Create New Account
          </button>
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-xs font-semibold text-slate-500 hover:text-white transition-colors text-center"
          >
            Become an Agent
          </button>
      </div>
    </div>
  );
};
