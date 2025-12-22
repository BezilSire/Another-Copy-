
import React, { useState, useEffect } from 'react';
import { User, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ShieldXIcon } from './icons/ShieldXIcon';

export const ProtocolReconciliation: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isAuditRunning, setIsAuditRunning] = useState(true);
    const [auditResult, setAuditResult] = useState<{ totalBlocks: number, verified: number, balanceMismatch: boolean } | null>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    useEffect(() => {
        const runAudit = async () => {
            addLog("INITIALIZING SOVEREIGN STATE AUDIT...");
            addLog("FETCHING GLOBAL SIGNED EVENT STREAM...");
            
            try {
                const ledger = await api.getPublicLedger(100);
                addLog(`BUFFERED ${ledger.length} SIGNED BLOCKS.`);
                
                let verifiedCount = 0;
                let computedBalance = 0;

                for (const tx of ledger) {
                    const blockId = tx.id.substring(0, 8);
                    addLog(`VERIFYING BLOCK [${blockId}]...`);
                    
                    const isValid = cryptoService.verifySignature(tx.hash, tx.signature, tx.senderPublicKey);
                    
                    if (isValid) {
                        verifiedCount++;
                        if (tx.receiverId === user.id) computedBalance += tx.amount;
                        if (tx.senderId === user.id) computedBalance -= tx.amount;
                    } else {
                        addLog(`!! PROTOCOL BREACH DETECTED IN BLOCK ${blockId}`);
                    }
                    
                    // Artificial delay for terminal effect
                    await new Promise(r => setTimeout(r, 100));
                }

                const balanceMatches = Math.abs(computedBalance - (user.ubtBalance || 0)) < 0.01;
                
                setAuditResult({
                    totalBlocks: ledger.length,
                    verified: verifiedCount,
                    balanceMismatch: !balanceMatches
                });
                
                addLog("AUDIT COMPLETE.");
                if (balanceMatches) {
                    addLog("STATE MIRROR INTEGRITY: VERIFIED.");
                } else {
                    addLog("STATE MIRROR INTEGRITY: MISMATCH DETECTED.");
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
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all">✕</button>
            </div>

            <div className="flex-1 bg-slate-950 border border-white/5 rounded-[2rem] p-6 overflow-y-auto no-scrollbar space-y-2 text-[10px] text-brand-gold/80">
                {logs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                {isAuditRunning && <div className="w-2 h-3 bg-brand-gold animate-terminal-cursor"></div>}
            </div>

            {auditResult && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
                    <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase mb-2">Sync Status</p>
                        <div className="flex items-center gap-3">
                            <ShieldCheckIcon className="h-6 w-6 text-green-500" />
                            <span className="text-lg font-black text-white">{auditResult.verified}/{auditResult.totalBlocks} Blocks</span>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase mb-2">Mirror Integrity</p>
                        <span className={`text-lg font-black ${auditResult.balanceMismatch ? 'text-red-500' : 'text-green-500'}`}>
                            {auditResult.balanceMismatch ? 'MISMATCH' : 'HEALTHY'}
                        </span>
                    </div>
                    <div className="flex items-end">
                         <button onClick={onClose} className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-widest text-xs">Return to Node</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ShieldXIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m14.5 9-5 5" /><path d="m9.5 9 5 5" />
  </svg>
);
