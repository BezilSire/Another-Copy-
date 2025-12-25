import React, { useState } from 'react';
import { Agent } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

type SignupCredentials = Pick<Agent, 'name' | 'email' | 'circle'> & {
  password: string;
};

interface SignupPageProps {
  onSignup: (credentials: SignupCredentials) => Promise<void>;
  isProcessing: boolean;
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, isProcessing, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [circle, setCircle] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSignup({ name, email, password, circle }).catch(() => {});
  };

  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/10 relative overflow-hidden shadow-2xl w-full max-w-md animate-fade-in">
      <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
      
      <div className="flex flex-col items-center mb-10 relative z-10 pt-4">
        <div className="w-16 h-16 bg-black rounded-2xl border border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-6">
            <LogoIcon className="h-10 w-10 text-brand-gold" />
        </div>
        <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none">Facilitator</h2>
        <p className="label-caps mt-2 !text-brand-gold">Agent Node Deployment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="space-y-2">
          <label className="label-caps pl-1" htmlFor="name">Full Designation</label>
          <input 
            id="name" 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all" 
            placeholder="ENTER LEGAL NAME" 
            required 
            disabled={isProcessing} 
          />
        </div>

        <div className="space-y-2">
          <label className="label-caps pl-1" htmlFor="email">Comms Address</label>
          <input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all" 
            placeholder="EMAIL@PROTOCOL.ORG" 
            required 
            disabled={isProcessing} 
          />
        </div>

        <div className="space-y-2">
          <label className="label-caps pl-1" htmlFor="circle">Operational Circle</label>
          <input 
            id="circle" 
            type="text" 
            value={circle} 
            onChange={(e) => setCircle(e.target.value)} 
            className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all" 
            placeholder="CITY / AREA" 
            required 
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
                placeholder="STRICT KEY"
                required 
                minLength={6} 
                disabled={isProcessing} 
            />
            <button type="button" onClick={() => setIsPasswordVisible((prev) => !prev)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-brand-gold transition-colors">
              {isPasswordVisible ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[11px] mt-4"
          disabled={isProcessing}
        >
          {isProcessing ? "Deploying Node..." : "Initiate Deployment"}
        </button>
      </form>

      <div className="mt-10 text-center relative z-10 border-t border-white/5 pt-8">
          <button type="button" onClick={onSwitchToLogin} className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors">
            Existing Authority? Secure Login
          </button>
      </div>
    </div>
  );
};