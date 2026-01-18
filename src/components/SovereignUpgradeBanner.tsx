
import React, { useState } from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { User } from '../types';
import { cryptoService } from '../services/cryptoService';
import { PinVaultLogin } from './PinVaultLogin';
import { useAuth } from '../contexts/AuthContext';

interface SovereignUpgradeBannerProps {
  onUpgrade: () => void;
  user: User;
}

export const SovereignUpgradeBanner: React.FC<SovereignUpgradeBannerProps> = ({ onUpgrade, user }) => {
  const { unlockSovereignSession } = useAuth();
  const [showUnlock, setShowUnlock] = useState(false);
  
  const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
  const hasVault = cryptoService.hasVault() || (user as any).encryptedVault;

  // SYSTEM LAW: If session is already open locally, hide banner
  if (isUnlocked) return null;

  if (showUnlock) {
      return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
              <div className="relative w-full max-w-md">
                <PinVaultLogin 
                    onUnlock={(data, pin) => { unlockSovereignSession(data, pin); setShowUnlock(false); }} 
                    onReset={() => { setShowUnlock(false); onUpgrade(); }} 
                />
                <button onClick={() => setShowUnlock(false)} className="absolute -top-16 right-0 text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest transition-all p-4">✕ Close</button>
              </div>
          </div>
      );
  }

  return (
    <div className="mb-8 relative group cursor-pointer overflow-hidden rounded-[2rem] border border-brand-gold/30 shadow-glow-gold bg-slate-950/80 backdrop-blur-xl animate-pulse-soft" onClick={hasVault ? () => setShowUnlock(true) : onUpgrade}>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/[0.05] to-transparent pointer-events-none"></div>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <ShieldCheckIcon className="h-24 w-24 text-brand-gold" />
      </div>
      
      <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl shadow-glow-gold shrink-0 ${hasVault ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-gold text-slate-950'}`}>
                {hasVault ? <ShieldCheckIcon className="h-6 w-6" /> : <AlertTriangleIcon className="h-6 w-6" />}
            </div>
            <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                    {hasVault ? 'Local Node Locked' : 'Sovereign Anchor Missing'}
                </h3>
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em] mt-3">
                    {hasVault ? 'Identity Recognized - Signature Required' : 'Upgrade to Sovereign Access'}
                </p>
                <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
                    {hasVault 
                        ? 'Your local node is anchored. Enter your PIN to enable cryptographic signatures and verified actions.'
                        : 'You are using email-only access. Initialize your Sovereign Anchor to own your $UBT equity and data.'}
                </p>
            </div>
        </div>
        
        <button className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-brand-gold hover:text-slate-950 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3">
            {hasVault ? 'Verify PIN' : 'Initialize Anchor'} <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
