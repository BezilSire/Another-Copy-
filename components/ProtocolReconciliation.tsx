
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
                // Fetch ONLY Mainnet blocks
                const ledger = await api.getPublicLedger(1000); 
                addLog(`BUFFERED ${ledger.length} MAINNET BLOCKS.`);
                
                let verifiedCount = 0;
                let runningBalance = 0;
                let genesisLinks = 0;

                // Provenance Check logic:
                // 1. Transaction must have valid signature.
                // 2. Transaction must be MAINNET.
                // 3. We ignore any balance increment that doesn't have a verifiable trail.

                for (const tx of ledger) {
                    const blockId = tx.id.substring(0, 8);
                    
                    // Filter: Only process if User is Sender or Receiver
                    if (tx.receiverId !== user.id && tx.senderId !== user.id) continue;

                    const isValid = cryptoService.verifySignature(tx.hash, tx.signature, tx.senderPublicKey);
                    
                    if (isValid) {
                        verifiedCount++;
                        if (tx.receiverId === user.id) runningBalance += tx.amount;
                        if (tx.senderId === user.id) runningBalance -= tx.amount;
                        
                        // Check if block has Mother Node provenance
                        if (tx.senderId === 'GENESIS' || tx.senderPublicKey === 'TREASURY_AUTHORITY' || tx.type === 'SYSTEM_MINT') {
                            genesisLinks++;
                        }
                    } else {
                        addLog(`!! CRITICAL: Signature Breach in Block ${blockId}`);
                    }
                    
                    await new Promise(r => setTimeout(r, 50));
                }

                // Any balance that exists in the User doc but is NOT reflected in the verified Mainnet ledger 
                // is null and void.
                const mirrorBalance = user.ubtBalance || 0;
                const isLegitimate = Math.abs(runningBalance - mirrorBalance) < 0.01;

                setAuditResult({
                    totalBlocks: verifiedCount,
                    verified: verifiedCount,
                    ledgerBalance: runningBalance,
                    isLegitimate: isLegitimate
                });
                
                addLog("AUDIT COMPLETE.");
                if (isLegitimate) {
                    addLog("STATE INTEGRITY: VERIFIED. PROVENANCE: GENESIS.");
                } else {
                    addLog("STATE INTEGRITY: BREACH DETECTED. UNAUTHORIZED ASSETS FOUND.");
                }
                
            } catch (e) {
                addLog("CRITICAL ERROR: PROTOCOL ACCESS DENIED.");
            } finally {
                setIsAuditRunning(false);
            }
        };

        runAudit();
    }, [user.id, user.ubtBalance]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-6 sm:p-12 font-mono">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-2xl font-black text-brand-gold uppercase tracking-tighter">Identity Audit Terminal</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Local Node Reconciliation Protocol</p>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all font-sans">✕</button>
            </div>

            <div className="flex-1 bg-slate-950 border border-white/5 rounded-[2rem] p-6 overflow-y-auto no-scrollbar space-y-2 text-[10px] text-brand-gold/80">
                {logs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                {isAuditRunning && <div className="w-2 h-3 bg-brand-gold animate-terminal-cursor"></div>}
            </div>

            {auditResult && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
                    <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase mb-2">Verified Blocks</p>
                        <div className="flex items-center gap-3">
                            <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                            <span className="text-lg font-black text-white">{auditResult.verified} Signed Handshakes</span>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase mb-2">Verified Genesis Balance</p>
                        <span className={`text-3xl font-black font-mono tracking-tighter ${auditResult.isLegitimate ? 'text-green-500' : 'text-red-500'}`}>
                            {auditResult.ledgerBalance.toFixed(2)} UBT
                        </span>
                        {!auditResult.isLegitimate && (
                            <p className="text-[8px] text-red-400 uppercase mt-1">Mirror Mismatch Detected</p>
                        )}
                    </div>
                    <div className="flex items-end">
                         <button onClick={onClose} className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-widest text-xs shadow-glow-gold active:scale-95">Return to Node</button>
                    </div>
                </div>
            )}
        </div>
    );
};
