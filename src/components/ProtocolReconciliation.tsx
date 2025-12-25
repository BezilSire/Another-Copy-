import React, { useState, useEffect } from 'react';
import { User, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export const ProtocolReconciliation: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isAuditRunning, setIsAuditRunning] = useState(true);
    const [currentVerified, setCurrentVerified] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(Number(user.initialUbtStake || 0));
    const [isIntegrityValid, setIsIntegrityValid] = useState<boolean | null>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    useEffect(() => {
        const runAudit = async () => {
            addLog("INITIALIZING SOVEREIGN STATE AUDIT...");
            addLog("FETCHING GLOBAL MAINNET EVENT STREAM...");
            
            try {
                const ledger = await api.getUserLedger(user.id); 
                addLog(`BUFFERED ${ledger.length} RELEVANT BLOCKS.`);
                
                let runningBalance = Number(user.initialUbtStake || 0);
                let verifiedCount = 0;

                addLog(`ANCHORED GENESIS STATE: ${runningBalance.toFixed(4)} UBT.`);

                for (const tx of ledger) {
                    const blockId = tx.id.substring(0, 8);
                    
                    const isAuthorityBlock = ['GENESIS', 'FLOAT', 'SYSTEM', 'REDEMPTION'].includes(tx.senderId) || 
                                           tx.type?.includes('BRIDGE') || 
                                           tx.type === 'SYSTEM_MINT';

                    let isValid = false;
                    
                    if (isAuthorityBlock) {
                        isValid = true;
                    } else if (tx.hash && tx.signature && tx.senderPublicKey) {
                        isValid = cryptoService.verifySignature(tx.hash, tx.signature, tx.senderPublicKey);
                    }
                    
                    if (isValid) {
                        verifiedCount++;
                        const amt = Number(tx.amount || 0);
                        if (tx.receiverId === user.id) runningBalance += amt;
                        if (tx.senderId === user.id) runningBalance -= amt;
                        
                        // Update real-time counters for the top-level UI
                        setCurrentVerified(verifiedCount);
                        setCurrentBalance(runningBalance);
                    } else {
                        addLog(`!! CRITICAL: Signature Breach in Block ${blockId}`);
                    }
                    
                    // Small delay to make the "climb" visible and high-tech
                    if (verifiedCount % 5 === 0) await new Promise(r => setTimeout(r, 10));
                }

                const mirrorBalance = Number(user.ubtBalance || 0);
                const isLegitimate = Math.abs(runningBalance - mirrorBalance) < 0.0001;
                setIsIntegrityValid(isLegitimate);
                
                addLog(`AUDIT COMPLETE. INDEXED ${verifiedCount} SIGNED BLOCKS.`);
                
                if (isLegitimate) {
                    addLog("STATE INTEGRITY: VERIFIED. MIRROR MATCHES LEDGER.");
                } else {
                    addLog(`STATE INTEGRITY: MIRROR MISMATCH DETECTED.`);
                }
                
            } catch (e) {
                console.error(e);
                addLog("CRITICAL ERROR: PROTOCOL ACCESS DENIED.");
            } finally {
                setIsAuditRunning(false);
            }
        };

        runAudit();
    }, [user.id, user.ubtBalance, user.initialUbtStake]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-6 sm:p-10 font-mono overflow-hidden">
            {/* HEADER */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-black text-brand-gold uppercase tracking-tighter">Identity Audit Terminal</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Sovereign Reconciliation Protocol v4.5</p>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all font-sans">✕</button>
            </div>

            {/* RESULTS GRID (MOVED TO TOP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
                <div className="p-6 bg-slate-900 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                        <ShieldCheckIcon className="h-10 w-10" />
                    </div>
                    <p className="text-[9px] text-gray-500 uppercase mb-2 tracking-widest">Blocks Verified</p>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isAuditRunning ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <p className="text-3xl font-black text-white">{currentVerified}</p>
                    </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                    {isIntegrityValid === true && (
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                            <ShieldCheckIcon className="h-12 w-12 text-emerald-500" />
                        </div>
                    )}
                    <p className="text-[9px] text-gray-500 uppercase mb-2 tracking-widest">Calculated Stake</p>
                    <span className={`text-4xl font-black font-mono tracking-tighter ${isIntegrityValid === false ? 'text-red-500' : 'text-emerald-500'}`}>
                        {currentBalance.toLocaleString()} <span className="text-xs">UBT</span>
                    </span>
                </div>

                <div className="flex items-end">
                    <button 
                        onClick={onClose} 
                        disabled={isAuditRunning}
                        className={`w-full py-5 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg ${isAuditRunning ? 'bg-white/5 text-gray-600' : isIntegrityValid === false ? 'bg-red-600 text-white' : 'bg-brand-gold text-slate-950 shadow-glow-gold'}`}
                    >
                        {isAuditRunning ? 'Audit In Progress...' : isIntegrityValid === false ? 'Security Breach: Contact Admin' : 'Re-Authorize Session'}
                    </button>
                </div>
            </div>

            {/* TERMINAL LOGS (MOVED TO BOTTOM & HEIGHT LIMITED) */}
            <div className="flex-1 min-h-0 bg-slate-950 border border-white/5 rounded-[2rem] p-6 overflow-hidden flex flex-col shadow-inner">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4 border-b border-white/5 pb-2">Diagnostic Stream</p>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 text-[10px] text-brand-gold/70">
                    {logs.map((log, i) => (
                        <div key={i} className="animate-fade-in break-all leading-relaxed">
                            {log}
                        </div>
                    ))}
                    {isAuditRunning && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-2 h-4 bg-brand-gold animate-terminal-cursor shadow-glow-gold"></div>
                            <span className="text-[8px] animate-pulse">DERIVING_PROVENANCE...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER ADVISORY */}
            <div className="mt-4 flex justify-between items-center px-4">
                <p className="text-[7px] text-gray-700 uppercase tracking-[0.6em] font-black">Secure Handshake: Ed25519-Sovereign</p>
                {!isAuditRunning && isIntegrityValid === true && (
                    <div className="flex items-center gap-2 text-emerald-500/50">
                        <ShieldCheckIcon className="h-3 w-3" />
                        <span className="text-[7px] font-black uppercase tracking-widest">Consensus Achieved</span>
                    </div>
                )}
            </div>
        </div>
    );
};
