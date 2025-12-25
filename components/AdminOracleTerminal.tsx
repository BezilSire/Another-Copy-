import React, { useState } from 'react';
import { PendingUbtPurchase, SellRequest, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';

interface AdminOracleTerminalProps {
    purchases: PendingUbtPurchase[];
    liquidations: SellRequest[];
    admin: Admin;
}

export const AdminOracleTerminal: React.FC<AdminOracleTerminalProps> = ({ purchases, liquidations, admin }) => {
    const { addToast } = useToast();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [usdInjection, setUsdInjection] = useState('');

    const handleInjectUSD = async () => {
        const val = parseFloat(usdInjection);
        if (isNaN(val) || val <= 0) return;
        setBusyId('injection');
        try {
            await api.injectCVPUSD(val);
            addToast(`QUANTUM INJECTION: +$${val} BACKING USD`, "success");
            setUsdInjection('');
        } catch (e) {
            addToast("Injection failure.", "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleSettleBridge = async (p: PendingUbtPurchase) => {
        if (!window.confirm(`SETTLE HANDSHAKE: Release ${p.amountUbt} UBT to ${p.userName}?`)) return;
        setBusyId(p.id);
        try {
            await api.approveUbtPurchase(admin, p, 'FLOAT');
            addToast(`HANDSHAKE_${p.id.substring(0,8)}: SETTLED`, "success");
        } catch (e: any) {
            addToast(`FAIL: ${e.message}`, "error");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            
            {/* ECONOMY MANAGEMENT PANEL */}
            <div className="module-frame glass-module p-10 rounded-[3rem] border-brand-gold/30 shadow-glow-gold relative overflow-hidden">
                <div className="corner-tl"></div><div className="corner-tr"></div>
                <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                             <div className="p-3 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 text-brand-gold">
                                <DollarSignIcon className="h-6 w-6" />
                             </div>
                             <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">CVP Backing Ingress</h3>
                                <p className="label-caps !text-[8px] text-gray-500">Inject USD liquidity to increase UBT Floor Price</p>
                             </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed uppercase font-black tracking-widest opacity-60">
                            Members pay $10 entry. Admin manually injects the net USD here. Oracle will instantly rebalance the Global UBT Market Price.
                        </p>
                    </div>

                    <div className="w-full lg:w-96 flex gap-4">
                        <input 
                            type="number" 
                            value={usdInjection}
                            onChange={e => setUsdInjection(e.target.value)}
                            className="flex-1 bg-black border border-white/10 p-5 rounded-2xl text-white font-mono text-xl focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                            placeholder="0.00 USD"
                        />
                        <button 
                            onClick={handleInjectUSD}
                            disabled={busyId === 'injection' || !usdInjection}
                            className="px-10 py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold transition-all active:scale-95 disabled:opacity-20"
                        >
                            {busyId === 'injection' ? "SYNCING..." : "INJECT"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* BRIDGE SETTLEMENTS */}
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 space-y-10">
                    <div className="flex justify-between items-center border-b border-white/5 pb-8">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Bridge Ingress</h2>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Awaiting Evidence Verification</p>
                        </div>
                        <span className="px-4 py-1.5 bg-emerald-950/20 text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-900/30 uppercase">{purchases.length} REQS</span>
                    </div>

                    <div className="space-y-4">
                        {purchases.map(p => (
                            <div key={p.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all flex flex-col gap-6 relative group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-black uppercase text-sm tracking-tight">{p.userName}</p>
                                        <p className="text-[9px] text-gray-600 font-mono mt-1 uppercase">{formatTimeAgo(p.createdAt.toDate().toISOString())}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-emerald-500 font-mono tracking-tighter">{p.amountUbt} UBT</p>
                                        <p className="text-[10px] text-white font-black opacity-40 tracking-widest">${p.amountUsd.toFixed(2)} USD</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-black/60 p-4 rounded-xl border border-white/5 text-brand-gold font-bold tracking-widest text-[10px] truncate select-all">
                                        {p.ecocashRef}
                                    </div>
                                    <button 
                                        onClick={() => handleSettleBridge(p)}
                                        disabled={!!busyId}
                                        className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg transition-all"
                                    >
                                        {busyId === p.id ? "SYNCING..." : "SETTLE"}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {purchases.length === 0 && <div className="py-20 text-center uppercase tracking-widest text-gray-700 opacity-20 text-[10px]">No ingress protocols logged</div>}
                    </div>
                </div>

                {/* LIQUIDATIONS */}
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 space-y-10">
                     <div className="flex justify-between items-center border-b border-white/5 pb-8">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Liquidation Egress</h2>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Treasury Asset Return Protocol</p>
                        </div>
                        <span className="px-4 py-1.5 bg-red-950/20 text-red-500 rounded-xl text-[10px] font-black border border-red-900/30 uppercase">{liquidations.length} REQS</span>
                    </div>

                    <div className="space-y-4">
                        {liquidations.filter(r => r.status !== 'COMPLETED').map(req => (
                            <div key={req.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col gap-6 group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-black uppercase text-sm">{req.userName}</p>
                                        <p className="text-[10px] text-blue-400 font-bold font-mono mt-1 tracking-widest">{req.userPhone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-red-500 font-mono tracking-tighter">{req.amountUbt} UBT</p>
                                        <p className="text-[10px] text-white font-black opacity-40">${req.amountUsd.toFixed(2)} USD</p>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-slate-800 hover:bg-red-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all">Authorize Settlement</button>
                            </div>
                        ))}
                        {liquidations.length === 0 && <div className="py-20 text-center uppercase tracking-widest text-gray-700 opacity-20 text-[10px]">No liquidation protocols logged</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
