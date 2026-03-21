
import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, CheckCircle2, LogOut, RefreshCw, Loader2, X } from 'lucide-react';

interface WhatsAppLinkProps {
    userId: string;
}

export const WhatsAppLink: React.FC<WhatsAppLinkProps> = ({ userId }) => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'ready'>('disconnected');
    const [qr, setQr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`/api/whatsapp/status?userId=${userId}`);
            const data = await res.json();
            setStatus(data.status);
            setQr(data.qr);
        } catch (err) {
            console.error('Failed to fetch WhatsApp status:', err);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [userId]);

    const handleInit = async () => {
        setLoading(true);
        try {
            await fetch('/api/whatsapp/init', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            await fetchStatus();
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async (confirmFirst = true) => {
        if (confirmFirst && !confirm('Are you sure you want to disconnect WhatsApp?')) return;
        setLoading(true);
        try {
            await fetch('/api/whatsapp/logout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            await fetchStatus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Smartphone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">WhatsApp Gateway</h3>
                        <p className="text-xs text-slate-400">Link your account to use the protocol on WhatsApp</p>
                    </div>
                </div>
                {status === 'ready' && (
                    <button 
                        onClick={() => handleLogout(true)}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Disconnect"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex flex-col items-center justify-center min-h-[200px]">
                {status === 'ready' ? (
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Connected</h4>
                        <p className="text-sm text-slate-400 max-w-[200px] mx-auto">
                            Your protocol is now active on WhatsApp. You can start chatting there!
                        </p>
                    </div>
                ) : status === 'qr' && qr ? (
                    <div className="text-center animate-in fade-in zoom-in duration-300 relative">
                        <div className="bg-white p-4 rounded-2xl mb-4 inline-block shadow-2xl">
                            <img src={qr} alt="WhatsApp QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            Scan this QR code with WhatsApp on your phone
                        </p>
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Waiting for scan...</span>
                            </div>
                            <button
                                onClick={() => handleLogout(false)}
                                disabled={loading}
                                className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 bg-white/5"
                            >
                                <X className="w-3 h-3" />
                                Cancel Scan
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <QrCode className="w-8 h-8 text-slate-500" />
                        </div>
                        <button
                            onClick={handleInit}
                            disabled={loading}
                            className="bg-brand-gold text-slate-950 px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                            Initialize Link
                        </button>
                        <p className="text-xs text-slate-500 mt-4">
                            This will generate a one-time QR code
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-start gap-3 text-xs text-slate-500">
                    <div className="mt-0.5">•</div>
                    <p>Open WhatsApp on your phone</p>
                </div>
                <div className="flex items-start gap-3 text-xs text-slate-500 mt-2">
                    <div className="mt-0.5">•</div>
                    <p>Tap Menu or Settings and select Linked Devices</p>
                </div>
                <div className="flex items-start gap-3 text-xs text-slate-500 mt-2">
                    <div className="mt-0.5">•</div>
                    <p>Tap on Link a Device and point your phone to this screen</p>
                </div>
            </div>
        </div>
    );
};
