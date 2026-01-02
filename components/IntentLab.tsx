
import React, { useState } from 'react';
import { User, IntentRule } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { InfoIcon } from './icons/InfoIcon';

export const IntentLab: React.FC<{ user: User, onUpdateUser: (d: any) => Promise<void> }> = ({ user, onUpdateUser }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newRule, setNewRule] = useState<Partial<IntentRule>>({
        triggerType: 'TENSION_SPIKE',
        threshold: 25,
        actionAmount: 10
    });

    const handleSave = async () => {
        const rules = user.intents || [];
        const rule: IntentRule = {
            ...newRule as IntentRule,
            id: `intent-${Date.now()}`,
            status: 'watching',
            validatorIds: []
        };
        await onUpdateUser({ intents: [...rules, rule] });
        setIsCreating(false);
    };

    return (
        <div className="space-y-10 animate-fade-in font-sans">
            <div className="module-frame bg-slate-900/60 p-10 rounded-[3rem] border-white/5 shadow-premium text-center relative overflow-hidden">
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none mb-4">Intent Lab</h1>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Program your capital with sovereign logic.</p>
                <div className="mt-8 p-6 bg-black/40 rounded-3xl border border-white/5 text-left flex gap-4 max-w-2xl mx-auto items-start">
                    <InfoIcon className="h-5 w-5 text-brand-gold flex-shrink-0 mt-1" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
                        <strong className="text-white">What is Capital Intent?</strong> Guardian Logic allows you to automate node actions. For example, your node can automatically contribute to distress calls in your circle when tension spikes, or reinvest dividends based on specific market triggers.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                    onClick={() => setIsCreating(true)}
                    className="module-frame bg-black border-2 border-dashed border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-brand-gold/40 transition-all group"
                >
                    <div className="p-4 bg-white/5 rounded-full group-hover:bg-brand-gold group-hover:text-slate-950 transition-all">
                        <PlusIcon className="h-8 w-8" />
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white">New Capital Intent</span>
                </button>

                {(user.intents || []).map(intent => (
                    <div key={intent.id} className="module-frame glass-module p-8 rounded-[2.5rem] border-white/10 shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldCheckIcon className="h-10 w-10 text-brand-gold" />
                        </div>
                        <div>
                            <span className="px-3 py-1 bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest">{intent.status}</span>
                            <h3 className="text-lg font-black text-white mt-4 uppercase tracking-tight">{intent.triggerType.replace(/_/g, ' ')}</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                <span>Trigger Condition</span>
                                <span className="text-white font-mono">&gt; {intent.threshold}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                <span>Prime Allocation</span>
                                <span className="text-brand-gold font-mono">{intent.actionAmount} UBT</span>
                            </div>
                        </div>
                        <button className="w-full py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-all">Deactivate Protocol</button>
                    </div>
                ))}
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
                    <div className="module-frame glass-module p-10 rounded-[3.5rem] border-brand-gold/30 shadow-glow-gold max-w-lg w-full space-y-10 animate-fade-in relative">
                        <div className="corner-tl !border-brand-gold/50"></div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">Guardian Logic</h2>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Sensor Trigger</label>
                                <select 
                                    value={newRule.triggerType}
                                    onChange={e => setNewRule({...newRule, triggerType: e.target.value as any})}
                                    className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-black text-[11px] uppercase"
                                >
                                    <option value="TENSION_SPIKE">Circle Tension Spike</option>
                                    <option value="PEER_REQUEST">Verified Peer Request</option>
                                    <option value="TIME_ELAPSED">Temporal Reset</option>
                                </select>
                                <p className="text-[7px] text-gray-600 font-bold uppercase tracking-widest px-1">Tension Spike triggers when the circle sentiment analysis exceeds the threshold.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Threshold Sensitivity (%)</label>
                                <input 
                                    type="number" 
                                    value={newRule.threshold}
                                    onChange={e => setNewRule({...newRule, threshold: parseInt(e.target.value)})}
                                    className="w-full bg-black border border-white/10 p-5 rounded-2xl text-brand-gold font-mono text-xl" 
                                />
                                <p className="text-[7px] text-gray-600 font-bold uppercase tracking-widest px-1">How strong must the trigger be to execute the intent?</p>
                            </div>
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Intent Allocation (UBT)</label>
                                <input 
                                    type="number" 
                                    value={newRule.actionAmount}
                                    onChange={e => setNewRule({...newRule, actionAmount: parseInt(e.target.value)})}
                                    className="w-full bg-black border border-white/10 p-5 rounded-2xl text-emerald-500 font-mono text-xl" 
                                />
                                <p className="text-[7px] text-gray-600 font-bold uppercase tracking-widest px-1">The maximum asset volume dispatched per trigger event.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={handleSave} className="flex-1 py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all">Seal Intent</button>
                            <button onClick={() => setIsCreating(false)} className="px-8 py-5 bg-white/5 text-gray-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:text-white transition-all">Abort</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
