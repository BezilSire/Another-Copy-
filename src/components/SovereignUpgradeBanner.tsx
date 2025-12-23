
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface SovereignUpgradeBannerProps {
  onUpgrade: () => void;
}

export const SovereignUpgradeBanner: React.FC<SovereignUpgradeBannerProps> = ({ onUpgrade }) => {
  return (
    <div className="mb-8 relative group cursor-pointer overflow-hidden rounded-[2rem] border border-brand-gold/30 shadow-glow-gold bg-slate-950/80 backdrop-blur-xl animate-pulse-soft" onClick={onUpgrade}>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/[0.05] to-transparent pointer-events-none"></div>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <ShieldCheckIcon className="h-24 w-24 text-brand-gold" />
      </div>
      
      <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-brand-gold rounded-2xl text-slate-950 shadow-glow-gold shrink-0">
                <AlertTriangleIcon className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Identity Incomplete</h3>
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em] mt-3">Node Not Anchored Locally</p>
                <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
                    You are currently using insecure cloud-only access. Upgrade to a <strong className="text-white">Sovereign Node</strong> to cryptographically secure your $UBT equity and unlock advanced protocol features.
                </p>
            </div>
        </div>
        
        <button className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-brand-gold hover:text-slate-950 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3">
            Secure My Node <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
