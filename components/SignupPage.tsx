import React, { useState } from 'react';
import { NewPublicMemberData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cryptoService } from '../services/cryptoService';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface SignupPageProps {
  onSignup: (data: NewPublicMemberData, password: string) => Promise<void>;
  isProcessing: boolean;
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, isProcessing, onSwitchToLogin }) => {
  const { loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [hasConfirmedMnemonic, setHasConfirmedMnemonic] = useState(false);

  const handleGenerateMnemonic = () => {
    const newMnemonic = cryptoService.generateMnemonic();
    setMnemonic(newMnemonic);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mnemonic || !hasConfirmedMnemonic) {
      handleGenerateMnemonic();
      return;
    }
    // We'll pass the mnemonic to the signup function
    await (onSignup as any)({ full_name: name, email, mnemonic }, password).catch(() => {});
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans selection:bg-brand-gold/30">
      <div className="pro-card p-8 sm:p-10 w-full max-w-md animate-slide-up shadow-premium border-white/10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-brand-gold/30 flex items-center justify-center mb-6 shadow-lg">
              <LogoIcon className="h-9 w-9 text-brand-gold" />
          </div>
          <h2 className="text-3xl font-bold text-center text-white tracking-tight leading-none">
            {mnemonic ? "Secure Your Phrase" : "Sign Up"}
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-2 tracking-wide text-center px-4">
            {mnemonic 
              ? "This 12-word phrase is your only way to recover your account. Write it down and keep it safe." 
              : "Create your decentralized identity"}
          </p>
        </div>

        {mnemonic ? (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-3 gap-2 p-4 bg-slate-900/50 rounded-xl border border-white/5">
              {mnemonic.split(' ').map((word, i) => (
                <div key={i} className="flex flex-col items-center p-2 bg-slate-950 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 font-mono mb-1">{i + 1}</span>
                  <span className="text-sm font-bold text-brand-gold">{word}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start space-x-3 p-3 bg-brand-gold/5 rounded-lg border border-brand-gold/20">
              <input 
                id="confirm" 
                type="checkbox" 
                checked={hasConfirmedMnemonic} 
                onChange={(e) => setHasConfirmedMnemonic(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-gold focus:ring-brand-gold"
              />
              <label htmlFor="confirm" className="text-xs text-slate-300 leading-relaxed">
                I have written down my 12-word phrase and understand that if I lose it, I lose access to my $UBT forever.
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setMnemonic(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasConfirmedMnemonic || isProcessing}
                className="flex-[2] py-3.5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
              >
                {isProcessing ? "Anchoring Node..." : "Confirm & Sign Up"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="label-caps" htmlFor="name">Full Name</label>
              <input 
                id="name" 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your full name" 
                required 
                disabled={isProcessing} 
              />
            </div>

            <div className="space-y-2">
              <label className="label-caps" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@gmail.com" 
                required 
                disabled={isProcessing} 
              />
            </div>

            <div className="space-y-2">
              <label className="label-caps" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                    id="password" 
                    type={isPasswordVisible ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pr-12"
                    placeholder="Create a strong password"
                    required 
                    minLength={6} 
                    disabled={isProcessing} 
                />
                <button type="button" onClick={() => setIsPasswordVisible((prev) => !prev)} className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-500 hover:text-brand-gold transition-colors">
                  {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-md mt-2"
              disabled={isProcessing}
            >
              {isProcessing ? "Creating Account..." : "Generate Recovery Phrase"}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isProcessing}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-white/5 pt-6">
            <button type="button" onClick={onSwitchToLogin} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
              Return to Sign In
            </button>
        </div>
      </div>
    </div>
  );
};
