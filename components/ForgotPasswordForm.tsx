
import React, { useState } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';

interface ForgotPasswordFormProps {
  onReset: (email: string) => Promise<void>;
  isProcessing: boolean;
  onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onReset, isProcessing, onBack }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await onReset(email).catch(() => {
      // Errors handled by context
    });
  };

  return (
    <div className="module-frame glass-module p-8 sm:p-12 rounded-lg border-white/10 relative overflow-hidden shadow-2xl animate-fade-in">
      <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
      <div className="absolute inset-0 blueprint-grid opacity-[0.08] pointer-events-none"></div>

      <div className="relative z-10">
        <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none mb-4">State Recovery</h2>
        <p className="text-slate-300 text-center text-sm font-medium leading-relaxed mb-10">Enter your identity address to receive a recovery anchor link.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-1.5">
            <label className="label-caps block pl-1 !text-white" htmlFor="reset-email">
                Identity Address
            </label>
            <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/90 border border-white/20 rounded-lg py-4 px-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all placeholder-slate-500 data-mono"
                placeholder="USER@PROTOCOL.ORG"
                required
                disabled={isProcessing}
            />
            </div>
            
            <div className="flex flex-col gap-4">
                <button
                    type="submit"
                    className="w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-black font-black rounded-lg transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[11px]"
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Dispatching Recovery...' : 'Initiate State Recovery'}
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isProcessing}
                    className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-colors py-2"
                >
                    Back to Handshake
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
