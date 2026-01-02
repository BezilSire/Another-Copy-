
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { GlobeIcon } from './icons/GlobeIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export const RegistryHub: React.FC<{ user: User }> = ({ user }) => {
    const [pulse, setPulse] = useState(65);

    useEffect(() => {
        const interval = setInterval(() => {
            setPulse(prev => {
                const shift = Math.floor(Math.random() * 8) - 3;
                return Math.max(20, Math.min(95, prev + shift));
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-10 animate-fade-in pb-20 px-4 font-sans">
             <div className="module-frame bg-slate-950 p-10 rounded-[3rem] border-white/5 shadow-premium text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.03] to-transparent pointer-events-none"></div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none mb-4">The Registry</h1>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Physical Assets of the Global Collective.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="module-frame glass-module p-8 rounded-[3rem] border-emerald-500/20 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20">
                        <div className="h-full bg-emerald-500 transition-all duration-[3000ms]" style={{ width: `${pulse}%` }}></div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Solar Array Grid 01</h3>
                            <p className="label-caps !text-[8px] text-emerald-500 mt-2">Efficiency Pulse: Optimal</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shadow-glow-matrix"><GlobeIcon className="h-6 w-6"/></div>
                    </div>
                    <div className="p-6 bg-black rounded-3xl border border-white/5 shadow-inner">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 mb-4">
                            <span>TOTAL LOAD</span>
                            <span className="text-white font-mono">540 KW / 1.2 MW</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 shadow-glow-matrix transition-all duration-1000" style={{ width: '45%' }}></div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest leading-loose">
                        Minting Logic: 1 UBT created per 120 MW verifiable discharge.
                    </p>
                </div>

                <div className="module-frame glass-module p-8 rounded-[3rem] border-blue-500/20 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
                        <div className="h-full bg-blue-500 transition-all duration-[3000ms]" style={{ width: `${100 - pulse}%` }}></div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Water Node B4</h3>
                            <p className="label-caps !text-[8px] text-blue-500 mt-2">Flow Signature: Verified</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shadow-glow-matrix"><DatabaseIcon className="h-6 w-6"/></div>
                    </div>
                    <div className="p-6 bg-black rounded-3xl border border-white/5 shadow-inner">
                         <div className="flex justify-between text-[10px] font-black text-gray-500 mb-4">
                            <span>RESERVE VOLUME</span>
                            <span className="text-white font-mono">15.5k LITERS / DAY</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 shadow-glow-blue transition-all duration-1000" style={{ width: '82%' }}></div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest leading-loose">
                        Commons Impact: Serving 42 verified households in this Circle.
                    </p>
                </div>
            </div>

            <div className="p-10 bg-slate-900/40 rounded-[4rem] border border-white/5 text-center flex flex-col items-center gap-4 shadow-inner">
                <ShieldCheckIcon className="h-12 w-12 text-gray-700 animate-pulse" />
                <p className="label-caps !text-[12px] !tracking-[0.6em] text-gray-600">Physical Registry Synchronized</p>
            </div>
        </div>
    );
};
