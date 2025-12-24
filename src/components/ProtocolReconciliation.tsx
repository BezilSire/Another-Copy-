
import React, { useState, useEffect } from 'react';
import { User, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export const ProtocolReconciliation: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isAuditRunning, setIsAuditRunning] = useState(true);
    const [auditResult, setAuditResult] = useState<{ totalBlocks: number, verified: number, ledgerBalance: number, isLegitimate: boolean } | null>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    useEffect(() => {
        const runAudit = async () => {
            addLog("INITIALIZING SOVEREIGN STATE AUDIT...");
            addLog("FETCHING GLOBAL MAINNET EVENT STREAM...");
            
            try {
                // Fetch Global Stream
                const ledger = await api.getPublicLedger(1000); 
                addLog(`BUFFERED ${ledger.length} MAINNET BLOCKS.`);
                
                let verifiedCount = 0;
                let runningBalance = 0;
                let authorityBlocks = 0;

                for (const tx of ledger) {
                    const blockId = tx.id.substring(0, 8);
                    
                    // Filter: Only process if User is Sender or Receiver
                    if (tx.receiverId !== user.id && tx.senderId !== user.id) continue;

                    // PROVENANCE CHECK:
                    // 1. P2P: Must have valid Ed25519 signature.
                    // 2. AUTHORITY: Mints/Bridges from GENESIS/FLOAT nodes are trusted rules.
                    
                    const isAuthorityBlock = ['GENESIS', 'FLOAT', 'SYSTEM', 'REDEMPTION'].includes(tx.senderId) || 
                                           tx.type?.includes('BRIDGE') || 
                                           tx.type === 'SYSTEM_MINT';

                    let isValid = false;
                    
                    if (isAuthorityBlock) {
                        // Trust authority provenance for system level transactions
                        isValid = true;
                        authorityBlocks++;
                    } else if (tx.hash && tx.signature && tx.senderPublicKey) {
                        // Standard Ed25519 Verification for Peer Handshakes
                        isValid = cryptoService.verifySignature(tx.hash, tx.signature, tx.senderPublicKey);
                    }
                    
                    if (isValid) {
                        verifiedCount++;
                        if (tx.receiverId === user.id) runningBalance += tx.amount;
                        if (tx.senderId === user.id) runningBalance -= tx.amount;
                    } else {
                        addLog(`!! CRITICAL: Signature Breach in Block ${blockId}`);
                    }
                    
                    // Throttle for UI feel
                    if (verifiedCount % 5 === 0) await new Promise(r => setTimeout(r, 20));
                }

                // Balance Validation
                const mirrorBalance = user.ubtBalance || 0;
                // Allow for tiny floating point differences
                const isLegitimate = Math.abs(runningBalance - mirrorBalance) < 0.001;

                setAuditResult({
                    totalBlocks: verifiedCount,
                    verified: verifiedCount,
                    ledgerBalance: runningBalance,
                    isLegitimate: isLegitimate
                });
                
                addLog(`AUDIT COMPLETE. INDEXED ${verifiedCount} SIGNED BLOCKS.`);
                addLog(`AUTHORITY PROVENANCE NODES FOUND: ${authorityBlocks}`);
                
                if (isLegitimate) {
                    addLog("STATE INTEGRITY: VERIFIED. MIRROR MATCHES LEDGER.");
                } else {
                    addLog(`STATE INTEGRITY: MIRROR MISMATCH DETECTED. DIFF: ${(runningBalance - mirrorBalance).toFixed(4)} UBT`);
                }
                
            } catch (e) {
                console.error(e);
                addLog("CRITICAL ERROR: PROTOCOL ACCESS DENIED.");
            } finally {
                setIsAuditRunning(false);
            }
        };

        runAudit();
    }, [user.id, user.ubtBalance]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-6 sm:p-12 font-mono overflow-hidden">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-2xl font-black text-brand-gold uppercase tracking-tighter">Identity Audit Terminal</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Sovereign Reconciliation Protocol v4.2</p>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all font-sans">✕</button>
            </div>

            <div className="flex-1 bg-slate-950 border border-white/5 rounded-[2rem] p-8 overflow-y-auto no-scrollbar space-y-3 text-[10px] text-brand-gold/80 shadow-inner">
                {logs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                {isAuditRunning && <div className="w-2 h-4 bg-brand-gold animate-terminal-cursor shadow-glow-gold"></div>}
            </div>

            {auditResult && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
                    <div className="p-6 bg-slate-900 rounded-2xl border border-white/5 shadow-xl">
                        <p className="text-[9px] text-gray-500 uppercase mb-3 tracking-widest">Verified Log</p>
                        <div className="flex items-center gap-4">
                            <ShieldCheckIcon className="h-7 w-7 text-emerald-500" />
                            <div>
                                <p className="text-xl font-black text-white">{auditResult.verified}</p>
                                <p className="text-[7px] text-gray-600 uppercase font-black tracking-widest">Blocks Finalized</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                         {auditResult.isLegitimate && (
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <ShieldCheckIcon className="h-10 w-10 text-emerald-500" />
                            </div>
                         )}
                        <p className="text-[9px] text-gray-500 uppercase mb-3 tracking-widest">Ledger Weight</p>
                        <span className={`text-4xl font-black font-mono tracking-tighter ${auditResult.isLegitimate ? 'text-emerald-500' : 'text-red-500'}`}>
                            {auditResult.ledgerBalance.toLocaleString()} <span className="text-xs">UBT</span>
                        </span>
                    </div>
                    <div className="flex items-end">
                         <button 
                            onClick={onClose} 
                            className={`w-full py-5 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg ${auditResult.isLegitimate ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-red-600 text-white shadow-red-500/20'}`}
                         >
                            {auditResult.isLegitimate ? 'Re-Authorize Session' : 'Identity Breach Detected'}
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
};
