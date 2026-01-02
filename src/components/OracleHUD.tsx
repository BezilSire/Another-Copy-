
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { SparkleIcon } from './icons/SparkleIcon';
import { getChatBotResponse } from '../services/geminiService';
import { LoaderIcon } from './icons/LoaderIcon';

export const OracleHUD: React.FC<{ user: User }> = ({ user }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOracleAnalysis = async () => {
            setIsLoading(true);
            try {
                const prompt = `Act as the Ubuntium Oracle. The current user is ${user.name} in ${user.circle}. 
                Analyze the community environment. Mention that there's a potential Tension Spike in the circle related to "Commodity Access" 
                and mention their Civic Capital potential. Keep it under 50 words. Speak like a high-tech Divine Secretary of a Sovereign Protocol.`;
                const response = await getChatBotResponse(prompt);
                setAnalysis(response);
            } catch (error) {
                setAnalysis("Spectral main-line active. Resonance established. State synchronized.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOracleAnalysis();
    }, [user.name, user.circle]);

    return (
        <div className="module-frame bg-slate-900/80 rounded-[3rem] p-8 border border-brand-gold/30 shadow-glow-gold relative overflow-hidden animate-fade-in group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/[0.05] via-transparent to-emerald-500/[0.02] pointer-events-none"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <SparkleIcon className="h-24 w-24 text-brand-gold" />
            </div>

            <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold rounded-2xl text-slate-950 shadow-glow-gold">
                        <SparkleIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">The Oracle</h3>
                        <p className="label-caps !text-[8px] text-brand-gold mt-1 !tracking-[0.4em]">Mainline Synthesis Active</p>
                    </div>
                </div>

                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                    {isLoading ? (
                        <div className="flex items-center gap-4 py-2">
                            <LoaderIcon className="h-4 w-4 animate-spin text-brand-gold" />
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Parsing Network Pulse...</p>
                        </div>
                    ) : (
                        <p className="text-gray-300 text-sm leading-relaxed font-medium italic animate-typewriter overflow-hidden">
                            "{analysis}"
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Circle Tension: 18%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></div>
                        <span className="text-[8px] font-black text-brand-gold uppercase tracking-widest">Resonance: High</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Spectral Integrity: 99.4%</span>
                    </div>
                </div>
            </div>
            <style>{`
                .animate-typewriter {
                    animation: typewriter 3s steps(100) 1;
                }
                @keyframes typewriter {
                    from { width: 0; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
};
