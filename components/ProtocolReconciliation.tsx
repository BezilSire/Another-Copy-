import React, { useState, useEffect, useRef } from 'react';
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
    const scrollRef = useRef<HTMLDivElement>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

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
                        
                        setCurrentVerified(verifiedCount);
                        setCurrentBalance(runningBalance);
                    } else {
                        addLog(`!! CRITICAL: Signature Breach in Block ${tx.id.substring(0,8)}`);
                    }
                    
                    if (verifiedCount % 5 === 0) await new Promise(r => setTimeout(r, 10));
                }

                const mirrorBalance = Number(user.ubtBalance || 0);
                const diff = runningBalance - mirrorBalance;
                const isLegitimate = Math.abs(diff) < 0.0001;
                setIsIntegrityValid(isLegitimate);
                
                addLog(`AUDIT COMPLETE. INDEXED ${verifiedCount} SIGNED BLOCKS.`);
                
                if (isLegitimate) {
                    addLog("STATE INTEGRITY: VERIFIED. MIRROR MATCHES LEDGER.");
                } else {
                    addLog(`STATE INTEGRITY: MIRROR MISMATCH DETECTED. DIFF: ${diff.toFixed(6)} UBT`);
                }
                
            } catch (e) {
                addLog("CRITICAL ERROR: PROTOCOL ACCESS DENIED.");
            } finally {
                setIsAuditRunning(false);
            }
        };

        runAudit();
    }, [user.id, user.ubtBalance, user.initialUbtStake]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-mono overflow-hidden">
            {/* COMPACT TOP HEADER */}
            <div className="p-4 sm:p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-black text-brand-gold uppercase tracking-[0.3em]">Identity Audit</h2>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Handshake v4.5.2</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-all">✕</button>
            </div>

            {/* RESULTS VIEW - FIXED AT TOP */}
            <div className="p-4 sm:p-6 space-y-4 bg-black">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 relative overflow-hidden">
                        <p className="text-[8px] font-black text-gray-500 uppercase mb-1 tracking-widest">Blocks Scanned</p>
                        <p className="text-2xl font-black text-white font-mono">{currentVerified}</p>
                        {isAuditRunning && <div className="absolute bottom-0 left-0 h-0.5 bg-brand-gold animate-pulse w-full"></div>}
                    </div>

                    <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 relative overflow-hidden">
                        <p className="text-[8px] font-black text-gray-500 uppercase mb-1 tracking-widest">Protocol Stake</p>
                        <p className={`text-2xl font-black font-mono tracking-tighter ${isIntegrityValid === false ? 'text-red-500' : 'text-emerald-500'}`}>
                            {currentBalance.toLocaleString()} <span className="text-[10px]">UBT</span>
                        </p>
                    </div>
                </div>

                <button 
                    onClick={onClose} 
                    disabled={isAuditRunning}
                    className={`w-full py-4 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] transition-all active:scale-95 shadow-lg ${isAuditRunning ? 'bg-white/5 text-gray-700' : isIntegrityValid === false ? 'bg-red-600 text-white shadow-red-900/40' : 'bg-brand-gold text-slate-950 shadow-glow-gold'}`}
                >
                    {isAuditRunning ? 'Scanning Global Ledger...' : isIntegrityValid === false ? 'Contact Root Authority' : 'Re-Authorize Identity'}
                </button>
            </div>

            {/* DIAGNOSTIC STREAM - FILLS REMAINING SPACE */}
            <div className="flex-1 bg-black border-t border-white/5 flex flex-col min-h-0">
                <div className="px-6 py-2 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[7px] font-black text-gray-600 uppercase tracking-[0.4em]">Live Diagnostic Trace</span>
                    {isAuditRunning && <LoaderIcon className="h-3 w-3 animate-spin text-brand-gold opacity-50"/>}
                </div>
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-2 text-[10px] text-brand-gold/60 no-scrollbar"
                >
                    {logs.map((log, i) => (
                        <div key={i} className="animate-fade-in break-all leading-relaxed font-mono">
                            {log}
                        </div>
                    ))}
                    {isAuditRunning && (
                        <div className="flex items-center gap-2 mt-4">
                            <div className="w-1.5 h-3 bg-brand-gold animate-terminal-cursor shadow-glow-gold"></div>
                            <span className="text-[8px] font-black animate-pulse uppercase tracking-widest text-gray-500">Processing_Handshake...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER DOCS */}
            <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-between items-center">
                 <p className="text-[7px] text-gray-700 uppercase tracking-[0.6em] font-black">Mainnet Beta &bull; Node_Local</p>
                 {!isAuditRunning && isIntegrityValid && (
                    <div className="flex items-center gap-2 text-emerald-500">
                        <ShieldCheckIcon className="h-3 w-3" />
                        <span className="text-[7px] font-black uppercase tracking-widest">Consensus Achieved</span>
                    </div>
                 )}
            </div>
        </div>
    );
};
