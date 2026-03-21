import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SignupPage } from './SignupPage';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

export const AuthPage: React.FC = () => {
  const { login, loginWithGoogle, isProcessingAuth, sendPasswordReset, signup, restoreWallet } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [isRestoreMode, setIsRestoreMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch (err: any) {
      console.error("Login component error:", err);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await restoreWallet(mnemonic, email, password);
    } catch (err: any) {
      console.error("Restore component error:", err);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordReset(email);
      setIsResetMode(false);
    } catch (err: any) {
      console.error("Reset component error:", err);
    }
  };

  if (isSignup) {
    return <SignupPage onSignup={signup} isProcessing={isProcessingAuth} onSwitchToLogin={() => setIsSignup(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans selection:bg-brand-gold/30">
      <div className="pro-card p-8 sm:p-10 w-full max-w-md animate-slide-up shadow-premium border-white/10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-brand-gold/30 flex items-center justify-center mb-6 shadow-lg">
              <LogoIcon className="h-9 w-9 text-brand-gold" />
          </div>
          <h2 className="text-3xl font-bold text-center text-white tracking-tight leading-none">Ubuntium Global Commons</h2>
          <p className="text-xs font-medium text-slate-400 mt-2 tracking-wide">Sign In</p>
        </div>

        {isResetMode ? (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label className="label-caps" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email" 
                required 
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
              disabled={isProcessingAuth}
            >
              Reset Password
            </button>
            <button type="button" onClick={() => setIsResetMode(false)} className="w-full text-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Back to Sign In
            </button>
          </form>
        ) : isRestoreMode ? (
          <form onSubmit={handleRestore} className="space-y-6">
            <div className="space-y-2">
              <label className="label-caps" htmlFor="mnemonic">12-Word Recovery Phrase</label>
              <textarea 
                id="mnemonic" 
                value={mnemonic} 
                onChange={(e) => setMnemonic(e.target.value)} 
                placeholder="word1 word2 word3..." 
                className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-brand-gold font-mono focus:border-brand-gold outline-none transition-colors resize-none"
                required 
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
              />
            </div>
            <div className="space-y-2">
              <label className="label-caps" htmlFor="password">New Password</label>
              <input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Create a password" 
                required 
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
              disabled={isProcessingAuth}
            >
              {isProcessingAuth ? "Restoring..." : "Restore Wallet"}
            </button>
            <button type="button" onClick={() => setIsRestoreMode(false)} className="w-full text-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="label-caps" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@gmail.com" 
                required 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="label-caps" htmlFor="password">Password</label>
                <button type="button" onClick={() => setIsResetMode(true)} className="text-[11px] font-semibold text-brand-gold/70 hover:text-brand-gold transition-colors">Forgot Password?</button>
              </div>
              <div className="relative">
                <input 
                    id="password" 
                    type={isPasswordVisible ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pr-12"
                    placeholder="Enter your password"
                    required 
                />
                <button type="button" onClick={() => setIsPasswordVisible((prev) => !prev)} className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-500 hover:text-brand-gold transition-colors">
                  {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
              disabled={isProcessingAuth}
            >
              {isProcessingAuth ? "Verifying..." : "Sign In"}
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
              disabled={isProcessingAuth}
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

            <div className="mt-8 text-center border-t border-white/5 pt-6 flex flex-col space-y-4">
                <button type="button" onClick={() => setIsSignup(true)} className="text-sm font-bold text-white hover:text-brand-gold transition-colors">
                  Create New Account
                </button>
                <button type="button" onClick={() => setIsRestoreMode(true)} className="text-sm font-medium text-slate-400 hover:text-brand-gold transition-colors">
                  Restore Wallet with Phrase
                </button>
                <button type="button" onClick={() => { setIsRestoreMode(true); /* Secret mode handled in RecoveryProtocol */ }} className="text-sm font-medium text-slate-500 hover:text-brand-gold transition-colors">
                  Restore Wallet with Secret
                </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
