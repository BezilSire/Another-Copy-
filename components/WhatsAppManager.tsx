import React, { useState, useEffect } from 'react';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { useToast } from '../contexts/ToastContext';

interface WhatsAppInstance {
    id: string;
    status: 'connecting' | 'open' | 'close' | 'qr';
    qr?: string;
    lastUpdate: number;
}

export const WhatsAppManager: React.FC = () => {
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newSessionId, setNewSessionId] = useState('');
    const { addToast } = useToast();

    const fetchInstances = async () => {
        try {
            const res = await fetch('/api/whatsapp/instances');
            const data = await res.json();
            console.log('WhatsAppManager: Fetched instances:', data.map((i: any) => ({ id: i.id, status: i.status, hasQr: !!i.qr })));
            setInstances(data);
        } catch (error) {
            console.error('Failed to fetch instances:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
        const interval = setInterval(fetchInstances, 5000);
        return () => clearInterval(interval);
    }, []);

    const createInstance = async (forceReset: boolean = false) => {
        if (!newSessionId) {
            addToast('Please provide a Session ID', 'error');
            return;
        }
        try {
            const res = await fetch('/api/whatsapp/instance/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: newSessionId, forceReset })
            });
            if (res.ok) {
                addToast(forceReset ? 'Agent reset initiated' : 'Agent spawning initiated', 'success');
                setNewSessionId('');
                fetchInstances();
            }
        } catch (error) {
            addToast('Failed to create agent', 'error');
        }
    };

    const removeInstance = async (id: string) => {
        try {
            await fetch(`/api/whatsapp/instance/${id}`, { method: 'DELETE' });
            addToast('Agent terminated', 'success');
            fetchInstances();
        } catch (error) {
            addToast('Failed to terminate agent', 'error');
        }
    };

    return (
        <div className="bg-slate-950/80 border border-brand-gold/30 rounded-[2rem] overflow-hidden shadow-glow-gold animate-fade-in max-w-4xl mx-auto">
            {/* Hardware Header */}
            <div className="bg-slate-900/80 border-b border-white/5 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <GlobeIcon className="h-4 w-4 text-brand-gold" />
                        <h2 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">WhatsApp Agent Network</h2>
                    </div>
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Global Commerce Indexing Nodes</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="SESSION_ID" 
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-mono text-brand-gold placeholder:text-white/10 focus:outline-none focus:border-brand-gold/50 w-48 transition-all"
                            value={newSessionId}
                            onChange={(e) => setNewSessionId(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => createInstance(false)}
                        className="bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                        Spawn
                    </button>
                    <button 
                        onClick={() => createInstance(true)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        title="Force Reset"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="p-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <LoaderIcon className="w-10 h-10 text-brand-gold animate-spin" />
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest animate-pulse">Scanning Network...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {instances.map((instance) => (
                            <div key={instance.id} className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 hover:border-brand-gold/20 transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2.5 h-2.5 rounded-full ${
                                            instance.status === 'open' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 
                                            instance.status === 'qr' ? 'bg-amber-400 animate-pulse' : 'bg-white/10'
                                        }`} />
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">{instance.id}</p>
                                            <p className="text-[8px] font-mono text-white/20 uppercase">
                                                {instance.status === 'open' ? 'Node Synchronized' : 
                                                 instance.status === 'qr' ? 'Awaiting Handshake' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeInstance(instance.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-xl text-white/10 hover:text-red-500 transition-all"
                                        title="Terminate Node"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {instance.status === 'qr' && (
                                    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[1.5rem] shadow-inner">
                                        {instance.qr ? (
                                            <img src={instance.qr} alt="QR Code" className="w-40 h-40" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center w-40 h-40 text-slate-900">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mb-2"></div>
                                                <p className="text-[8px] font-black uppercase tracking-widest">Generating QR...</p>
                                            </div>
                                        )}
                                        <p className="text-[9px] text-slate-900 font-black uppercase tracking-widest text-center leading-relaxed">
                                            Scan to Link Node
                                        </p>
                                    </div>
                                )}

                                {instance.status === 'open' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                                <p className="text-[7px] font-black text-white/20 uppercase mb-1">Last Pulse</p>
                                                <p className="text-[10px] font-mono text-brand-gold">{new Date(instance.lastUpdate).toLocaleTimeString()}</p>
                                            </div>
                                            <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                                <p className="text-[7px] font-black text-white/20 uppercase mb-1">Uptime</p>
                                                <p className="text-[10px] font-mono text-green-400">Stable</p>
                                            </div>
                                        </div>
                                        <div className="bg-green-400/5 border border-green-400/10 p-3 rounded-2xl flex items-center justify-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">Indexing Commerce Stream</span>
                                        </div>
                                    </div>
                                )}

                                {instance.status === 'connecting' && (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <LoaderIcon className="w-6 h-6 text-brand-gold animate-spin" />
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Establishing Secure Link...</span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {instances.length === 0 && (
                            <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[2rem]">
                                <GlobeIcon className="h-8 w-8 text-white/5 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No active nodes detected in the network.</p>
                                <p className="text-[8px] text-white/10 uppercase mt-2">Spawn a new agent to begin indexing the Zim Pulse.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer Status Bar */}
            <div className="bg-slate-900/40 border-t border-white/5 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[8px] font-black text-white/40 uppercase">Network: Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                        <span className="text-[8px] font-black text-white/40 uppercase">Nodes: {instances.length}</span>
                    </div>
                </div>
                <p className="text-[8px] font-mono text-white/10 uppercase">Protocol v2.5.0-Pulse</p>
            </div>
        </div>
    );
};
