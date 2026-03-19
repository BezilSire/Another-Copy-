
import React, { useState, useEffect } from 'react';
import { ZimNews } from '../types';
import { GlobeIcon } from './icons/GlobeIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';

export const ZimPulseFeed: React.FC = () => {
    const [news, setNews] = useState<ZimNews[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking the "Agentic Scraper" results
        const mockNews: ZimNews[] = [
            {
                id: '1',
                title: 'Mbare Musika Price Update',
                content: 'Potato prices have stabilized at $6 per pocket. High supply from Mashonaland West.',
                source: 'Market Agent Alpha',
                url: '#',
                timestamp: { seconds: Date.now()/1000, nanoseconds: 0 } as any,
                category: 'agriculture',
                sentiment: 'positive',
                vouchCount: 12,
                vouchedBy: []
            },
            {
                id: '2',
                title: 'New SME Grant Announced',
                content: 'Ministry of Finance announces new low-interest loans for tech startups in Bulawayo.',
                source: 'Zim News Network',
                url: '#',
                timestamp: { seconds: Date.now()/1000 - 3600, nanoseconds: 0 } as any,
                category: 'economy',
                sentiment: 'positive',
                vouchCount: 45,
                vouchedBy: []
            },
            {
                id: '3',
                title: 'Fuel Price Adjustment',
                content: 'ZERA announces a slight decrease in petrol prices effective midnight.',
                source: 'Official Gazette',
                url: '#',
                timestamp: { seconds: Date.now()/1000 - 7200, nanoseconds: 0 } as any,
                category: 'economy',
                sentiment: 'neutral',
                vouchCount: 8,
                vouchedBy: []
            }
        ];

        setTimeout(() => {
            setNews(mockNews);
            setLoading(false);
        }, 1500);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <LoaderIcon className="w-8 h-8 text-brand-gold animate-spin" />
                <p className="label-caps animate-pulse">Scanning Zim Intelligence Pulse...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <GlobeIcon className="w-5 h-5 text-brand-gold" />
                    Ubuntium Global Commons Zim Pulse
                </h2>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Live
                    </span>
                </div>
            </div>

            <div className="grid gap-4 px-2">
                {news.map((item) => (
                    <div key={item.id} className="pro-card p-5 group hover:border-brand-gold/30 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                item.category === 'agriculture' ? 'bg-emerald-500/20 text-emerald-400' :
                                item.category === 'economy' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>
                                {item.category}
                            </span>
                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                {item.source}
                            </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-gold transition-colors">
                            {item.title}
                        </h3>
                        <p className="text-sm text-white/60 leading-relaxed mb-4">
                            {item.content}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-1.5 text-white/40 hover:text-brand-gold transition-colors">
                                    <ShieldCheckIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Vouch ({item.vouchCount})</span>
                                </button>
                                <button className="flex items-center gap-1.5 text-white/40 hover:text-brand-gold transition-colors">
                                    <TrendingUpIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
                                </button>
                            </div>
                            <button className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] hover:underline">
                                Earn $UBT
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
