import React, { useState, useEffect } from 'react';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { SirenIcon } from './icons/SirenIcon';
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

    const createInstance = async () => {
        if (!newSessionId) return;
        try {
            const res = await fetch('/api/whatsapp/instance/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: newSessionId })
            });
            if (res.ok) {
                addToast('Agent initialization started', 'success');
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
            addToast('Agent removed', 'success');
            fetchInstances();
        } catch (error) {
            addToast('Failed to remove agent', 'error');
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-medium text-white">WhatsApp Agent Network</h2>
                    <p className="text-sm text-slate-400">Manage your Ghost and Speaker agents across Zim.</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Session ID (e.g. Ghost-Harare)" 
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                        value={newSessionId}
                        onChange={(e) => setNewSessionId(e.target.value)}
                    />
                    <button 
                        onClick={createInstance}
                        className="bg-brand-gold text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-gold/90 transition-colors"
                    >
                        Spawn Agent
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <LoaderIcon className="w-8 h-8 text-brand-gold animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instances.map((instance) => (
                        <div key={instance.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        instance.status === 'open' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                        instance.status === 'qr' ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'
                                    }`} />
                                    <span className="font-mono text-sm text-white">{instance.id}</span>
                                </div>
                                <button 
                                    onClick={() => removeInstance(instance.id)}
                                    className="text-xs text-rose-500 hover:text-rose-400 font-medium"
                                >
                                    Terminate
                                </button>
                            </div>

                            {instance.status === 'qr' && instance.qr && (
                                <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg">
                                    <img src={instance.qr} alt="QR Code" className="w-48 h-48" />
                                    <p className="text-xs text-slate-900 font-medium text-center">
                                        Scan this QR code with WhatsApp to link the agent.
                                    </p>
                                </div>
                            )}

                            {instance.status === 'open' && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                                        <span>Status</span>
                                        <span className="text-emerald-500 font-bold">Active & Listening</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                                        <span>Last Pulse</span>
                                        <span>{new Date(instance.lastUpdate).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            )}

                            {instance.status === 'connecting' && (
                                <div className="flex items-center justify-center py-8 gap-3">
                                    <LoaderIcon className="w-5 h-5 text-brand-gold animate-spin" />
                                    <span className="text-sm text-slate-400">Establishing Secure Link...</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {instances.length === 0 && (
                        <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-xl">
                            <p className="text-slate-500 text-sm italic">No active agents. Spawn one to start indexing.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
