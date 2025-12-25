import React, { useState, useEffect } from 'react';
import { MemberUser, SustenanceVoucher, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { HeartIcon } from './icons/HeartIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LockIcon } from './icons/LockIcon';

interface SustenancePageProps {
  user: MemberUser;
}

const CountdownTimer: React.FC<{ nextDrop: Date }> = ({ nextDrop }) => {
    const calculateTimeLeft = () => {
        const difference = +nextDrop - +new Date();
        let timeLeft = { days: 0, hours: 0, minutes: 0 };
        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
            };
        }
        return timeLeft;
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    useEffect(() => {
        const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 60000);
        return () => clearTimeout(timer);
    });
    return (
        <div className="flex space-x-6 text-center">
            {Object.entries(timeLeft).map(([interval, value]) => (
                <div key={interval}>
                    <div className="text-5xl font-black text-white font-mono tracking-tighter">{String(value).padStart(2, '0')}</div>
                    <div className="text-[9px] uppercase font-black text-gray-500 tracking-widest mt-1">{interval}</div>
                </div>
            ))}
        </div>
    );
};

export const SustenancePage: React.FC<SustenancePageProps> = ({ user }) => {
    const [sustenanceVault, setSustenanceVault] = useState<TreasuryVault | null>(null);
    const [isLoadingVault, setIsLoadingVault] = useState(true);
    const activeVouchers = user.sustenanceVouchers?.filter(v => v.status === 'active') || [];
    const pastVouchers = user.sustenanceVouchers?.filter(v => v.status !== 'active') || [];
    const nextDropDate = new Date(Date.UTC(2025, 4, 1)); // Placeholder for next cycle

    useEffect(() => {
        const unsub = api.listenToVaults(vts => {
            const vault = vts.find(v => v.type === 'SUSTENANCE');
            if (vault) setSustenanceVault(vault);
            setIsLoadingVault(false);
        }, () => setIsLoadingVault(false));
        return () => unsub();
    }, []);

    return (
        <div className="space-y-10 animate-fade-in pb-20 font-sans">
             <div className="module-frame bg-slate-900/60 p-10 rounded-[3rem] border-white/5 shadow-premium overflow-hidden text-center relative">
                <div className="corner-tl opacity-20"></div><div className="corner-br opacity-20"></div>
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                    <div className="p-5 bg-brand-gold/5 rounded-full w-24 h-24 mx-auto border border-brand-gold/20 shadow-glow-gold flex items-center justify-center">
                         <HeartIcon className="h-10 w-10 text-brand-gold" />
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none">Sustenance Dividend</h1>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">Verifiable return of value to the Commons collective.</p>
                </div>
            </div>

            {/* Proof of Reserve Section */}
            <div className="module-frame bg-slate-950/80 p-8 rounded-[2.5rem] border border-brand-gold/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-brand-gold/10 rounded-2xl border border-brand-gold/30 text-brand-gold shadow-inner">
                        <LockIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="label-caps !text-[10px] text-white !tracking-[0.3em] mb-1">Sustenance Reserve Node</h3>
                        <p className="data-mono text-[9px] text-gray-500 uppercase break-all">ID: {sustenanceVault?.publicKey ?? 'PROVISIONING...'}</p>
                    </div>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-5xl font-black text-brand-gold font-mono tracking-tighter leading-none">
                        {isLoadingVault ? '...' : (sustenanceVault?.balance?.toLocaleString() ?? '0')} <span className="text-sm font-sans uppercase">UBT</span>
                    </p>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em] mt-3">Immutable Mainnet Anchor</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5 text-center">
                    <p className="label-caps !text-gray-500 mb-4">Your Lottery Weight</p>
                    <p className="text-7xl font-black text-white font-mono tracking-tighter">{user.ccap || 0}</p>
                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mt-4">Weighted Probability Indexed</p>
                </div>
                 <div className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center">
                     <p className="label-caps !text-gray-500 mb-6">Cycle Reset Countdown</p>
                    <CountdownTimer nextDrop={nextDropDate} />
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="label-caps !text-[11px] !text-gray-400 pl-4">Active Allocation</h2>
                {activeVouchers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {activeVouchers.map(v => (
                            <div key={v.id} className="module-frame bg-emerald-950/10 border-emerald-500/20 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-10 shadow-glow-matrix">
                                <div className="bg-white p-4 rounded-3xl shadow-2xl">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${v.id}`} alt="Voucher" className="w-32 h-32" />
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                     <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-3xl font-black text-white uppercase tracking-tighter">Food Voucher</p>
                                            <p className="text-lg font-black text-emerald-500 font-mono tracking-tighter">${v.value?.toFixed(2)} USD</p>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest">Signed</span>
                                     </div>
                                     <p className="text-[10px] text-gray-500 uppercase font-black leading-loose">Present this anchor to a verified vendor. Single-use protocol only. Do not duplicate dispatch.</p>
                                     <div className="flex items-center gap-2 text-[9px] font-black text-yellow-500 uppercase tracking-widest">
                                        <LoaderIcon className="h-3 w-3" /> Expires in {v.expiresAt ? formatTimeAgo(v.expiresAt.toDate().toISOString()) : '...'}
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center module-frame glass-module rounded-[3rem] border-white/5 opacity-40">
                        <ShieldCheckIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">No active allocations indexed</p>
                    </div>
                )}
            </div>
        </div>
    );
};
