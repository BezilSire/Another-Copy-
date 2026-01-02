
import React, { useState, useEffect } from 'react';
import { Admin, CitizenResource } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { GlobeIcon } from './icons/GlobeIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { PlusIcon } from './icons/PlusIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

export const AdminRegistrarTerminal: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [resources, setResources] = useState<CitizenResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState({ name: '', type: 'LAND', circle: '', location: '', capacity: '' });
    const { addToast } = useToast();

    useEffect(() => {
        const unsub = api.listenToResources('ANY', (data) => {
            setResources(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.circle || !formData.location) return;

        setIsProcessing(true);
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payload = `${formData.name}:${formData.type}:${formData.circle}:${formData.location}:${formData.capacity}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payload);
            
            const resourceData: Partial<CitizenResource> = {
                ...formData,
                status: 'OPTIMAL',
                managedBy: admin.id,
                signature: signature,
                nonce: nonce,
                signerKey: cryptoService.getPublicKey() || "",
            } as any;

            await api.registerResource(resourceData);
            addToast("PHYSICAL_ASSET_ANCHORED", "success");
            setFormData({ name: '', type: 'LAND', circle: '', location: '', capacity: '' });
        } catch (e: any) {
            addToast(`FAIL: ${e.message}`, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 animate-fade-in font-sans pb-20">
            {/* INPUT TERMINAL */}
            <div className="xl:col-span-4 space-y-8">
                <div className="module-frame glass-module p-8 rounded-[3rem] border-brand-gold/20 shadow-2xl space-y-8">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                        <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold">
                            <ShieldCheckIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Registrar Ingress</h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Anchoring Physical Commons</p>
                        </div>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <label className="label-caps !text-[9px]">Resource Designation</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                                className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-xs uppercase focus:ring-1 focus:ring-brand-gold/40 placeholder-gray-800"
                                placeholder="E.G. CHIPINGE SOLAR FARM"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Asset Class</label>
                                <select 
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-[10px] font-black uppercase focus:ring-1 focus:ring-brand-gold/30"
                                >
                                    <option value="LAND">LAND</option>
                                    <option value="WATER">WATER</option>
                                    <option value="ENERGY">ENERGY</option>
                                    <option value="FOOD">FOOD</option>
                                    <option value="EQUIPMENT">EQUIPMENT</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="label-caps !text-[9px]">Circle Target</label>
                                <input 
                                    type="text" 
                                    value={formData.circle}
                                    onChange={e => setFormData({...formData, circle: e.target.value.toUpperCase()})}
                                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-xs uppercase"
                                    placeholder="BULAWAYO"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="label-caps !text-[9px]">Spatial Anchor</label>
                            <input 
                                type="text" 
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value.toUpperCase()})}
                                className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-xs"
                                placeholder="ADDRESS / COORDS"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="label-caps !text-[9px]">Minting Capacity</label>
                            <input 
                                type="text" 
                                value={formData.capacity}
                                onChange={e => setFormData({...formData, capacity: e.target.value.toUpperCase()})}
                                className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-mono text-xs"
                                placeholder="E.G. 200KW / 10 HECTARES"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isProcessing}
                            className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3"
                        >
                            {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <>Certify State Asset <PlusIcon className="h-5 w-5"/></>}
                        </button>
                    </form>
                </div>
            </div>

            {/* STATE REGISTRY LIST */}
            <div className="xl:col-span-8 space-y-6">
                <div className="flex justify-between items-end px-4">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">State Inventory</h3>
                        <p className="label-caps !text-[8px] text-gray-500 mt-2">Authenticated Physical Commons Index</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <span className="text-[10px] font-black text-brand-gold font-mono">{resources.length} ANCHORS</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {resources.map(res => (
                        <div key={res.id} className="module-frame bg-slate-900/60 p-8 rounded-[3rem] border-white/5 group hover:border-brand-gold/30 transition-all shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                <DatabaseIcon className="h-20 w-20" />
                             </div>
                             <div className="flex justify-between items-start mb-6">
                                <span className="px-3 py-1 bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                    {res.type} &bull; CERTIFIED
                                </span>
                                <GlobeIcon className="h-5 w-5 text-gray-700 group-hover:text-brand-gold transition-colors" />
                             </div>
                             <h4 className="text-xl font-black text-white uppercase tracking-tight truncate">{res.name}</h4>
                             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{res.location}</p>
                             
                             <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                 <div className="flex justify-between items-end">
                                     <span className="label-caps !text-[7px]">Minting Pulse</span>
                                     <span className="text-[8px] text-emerald-500 font-mono">ACTIVE_FLOW</span>
                                 </div>
                                 <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                     <div className="h-full bg-emerald-500 shadow-glow-matrix animate-pulse-soft" style={{ width: '45%' }}></div>
                                 </div>
                             </div>

                             <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/5 relative">
                                 <div className="absolute inset-0 blueprint-grid opacity-[0.05] pointer-events-none"></div>
                                 <p className="text-[7px] text-gray-700 font-black uppercase tracking-widest mb-1 relative z-10">State Seal (Handshake ID)</p>
                                 <p className="text-[8px] font-mono text-brand-gold/60 break-all leading-tight relative z-10">{res.signature.substring(0, 80)}...</p>
                             </div>
                        </div>
                    ))}
                    {resources.length === 0 && (
                        <div className="col-span-full py-40 text-center opacity-10">
                            <GlobeIcon className="h-16 w-16 mx-auto mb-6 text-gray-800" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em]">Registry Void</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
