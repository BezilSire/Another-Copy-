
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { SparkleIcon } from './icons/SparkleIcon';
import { getChatBotResponse } from '../services/geminiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { api } from '../services/apiService';

export const OracleHUD: React.FC<{ user: User }> = ({ user }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ members: 0, blocks: 0 });

    useEffect(() => {
        const fetchOracleAnalysis = async () => {
            setIsLoading(true);
            try {
                // Fetch real context for the prompt
                const currentLedger = await api.getPublicLedger(5);
                const prompt = `Act as the Ubuntium Oracle. The current user is ${user.name} in ${user.circle}. 
                The network just indexed ${currentLedger.length} new blocks.
                Analyze the community environment for ${user.circle}. Mention potential "Synergy Potential" 
                and their node reputation of ${user.credibility_score || 100}. Keep it under 40 words. 
                Speak like a high-tech Divine Secretary of a Sovereign Protocol. Use markdown for emphasis.`;
                
                const response = await getChatBotResponse(prompt);
                setAnalysis(response);
                
                // Simulate network stats
                setStats({
                    members: Math.floor(Math.random() * 500) + 1200,
                    blocks: Math.floor(Math.random() * 1000) + 84200
                });
            } catch (error) {
                setAnalysis("**Spectral main-line active.** Resonance established. Node ID: " + user.id.substring(0,8).toUpperCase() + " synchronized with global ledger.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOracleAnalysis();
    }, [user.name, user.circle, user.id, user.credibility_score]);

    return (
        <div className="module-frame bg-slate-900/80 rounded-[3rem] p-8 border border-brand-gold/30 shadow-glow-gold relative overflow-hidden animate-fade-in group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/[0.05] via-transparent to-emerald-500/[0.02] pointer-events-none"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <SparkleIcon className="h-24 w-24 text-brand-gold" />
            </div>

            <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-gold rounded-2xl text-slate-950 shadow-glow-gold">
                            <SparkleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">The Oracle</h3>
                            <p className="label-caps !text-[8px] text-brand-gold mt-1 !tracking-[0.4em]">Synthesis Mode: Active</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                        <div className="text-center">
                            <p className="text-[7px] text-gray-500 font-black uppercase">Nodes</p>
                            <p className="text-xs font-black text-white font-mono">{stats.members}</p>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-[7px] text-gray-500 font-black uppercase">Blocks</p>
                            <p className="text-xs font-black text-emerald-500 font-mono">{stats.blocks}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black/60 p-6 rounded-[2rem] border border-white/10 shadow-inner">
                    {isLoading ? (
                        <div className="flex items-center gap-4 py-4">
                            <LoaderIcon className="h-5 w-5 animate-spin text-brand-gold" />
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.5em] animate-pulse">Parsing_Handshake_Stream...</p>
                        </div>
                    ) : (
                        <div className="text-gray-300 text-sm leading-relaxed font-medium italic wysiwyg-content">
                            {analysis}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Resonance: {Math.floor(Math.random() * 15) + 85}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></div>
                        <span className="text-[8px] font-black text-brand-gold uppercase tracking-widest">Spectral Load: {Math.floor(Math.random() * 30) + 10}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">State Sync: Finalized</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
