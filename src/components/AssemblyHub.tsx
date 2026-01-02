
import React from 'react';
import { User, PublicUserProfile } from '../types';
import { ConnectionRadar } from './ConnectionRadar';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export const AssemblyHub: React.FC<{ currentUser: User, onViewProfile: (id: string) => void }> = ({ currentUser, onViewProfile }) => {
    return (
        <div className="space-y-10 animate-fade-in pb-20 px-4 font-sans">
            <div className="module-frame bg-slate-950 p-10 rounded-[3rem] border-white/5 shadow-premium text-center relative overflow-hidden">
                <div className="corner-tl opacity-20"></div><div className="corner-br opacity-20"></div>
                <div className="absolute inset-0 blueprint-grid opacity-[0.02] pointer-events-none"></div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none mb-4">The Assembly</h1>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">The Living Web of Verified Trust.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="module-frame glass-module p-10 rounded-[3rem] border-emerald-500/20 shadow-glow-matrix text-center space-y-6">
                    <p className="label-caps !text-gray-500">Node Resonance</p>
                    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r="75" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
                            <circle 
                                cx="80" cy="80" r="75" fill="none" stroke="#D4AF37" strokeWidth="10" 
                                strokeDasharray="471" strokeDashoffset={471 - (471 * 0.85)}
                                className="transition-all duration-1000 shadow-glow-gold"
                            />
                        </svg>
                        <p className="text-5xl font-black text-white font-mono">850</p>
                    </div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Standing: Sovereign Node</p>
                </div>

                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/10 space-y-8">
                    <h3 className="label-caps !text-[10px] text-gray-500 border-b border-white/5 pb-4">Social Friction Protocol</h3>
                    <div className="space-y-4">
                         <p className="text-sm text-gray-400 leading-relaxed uppercase font-bold tracking-widest opacity-80">
                            Physical proximity anchors truth. Meet citizens in person to sign high-resonance handshakes.
                        </p>
                        <button className="w-full py-6 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-premium active:scale-95 transition-all">Initialize Proximity Lens</button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-4 px-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                    <h2 className="label-caps !text-[11px] text-gray-400">Global Connection Spectrum</h2>
                </div>
                <div className="h-[600px] module-frame bg-slate-950 rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden relative group">
                    <ConnectionRadar 
                        currentUser={currentUser} 
                        onViewProfile={onViewProfile} 
                        onStartChat={(id) => console.log("Comms link", id)} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none opacity-40"></div>
                </div>
            </div>
        </div>
    );
};
