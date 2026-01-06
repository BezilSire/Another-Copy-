
import React, { useState, useMemo, useRef } from 'react';
import { Admin, User, Member, Agent, Report, Broadcast, PayoutRequest, Venture, CommunityValuePool } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ClockIcon } from './icons/ClockIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { DonutChart } from './DonutChart';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

interface DashboardProps {
  user: Admin;
  users: User[];
  agents: Agent[];
  members: Member[];
  pendingMembers: Member[];
  reports: Report[];
  broadcasts: Broadcast[];
  payouts: PayoutRequest[];
  ventures: Venture[];
  cvp: CommunityValuePool | null;
  onSendBroadcast: (message: string) => Promise<void>;
}

const DashboardStat: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string; glow: string; isLoading?: boolean }> = ({ icon, title, value, color, glow, isLoading }) => (
  <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl transition-all hover:scale-[1.02] duration-300 shadow-xl relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
    <div className={`inline-flex p-3 rounded-2xl ${color} ${glow} mb-4 text-white relative z-10 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1 relative z-10">{title}</p>
    {isLoading ? (
        <div className="h-9 w-20 bg-white/5 rounded animate-pulse relative z-10"></div>
    ) : (
        <p className="text-3xl font-black text-white font-mono tracking-tighter relative z-10">{value}</p>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = (props) => {
    const { users, members, agents, pendingMembers, reports, onSendBroadcast, broadcasts } = props;
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const isSyncing = users.length === 0;

    const userStatusData = useMemo(() => {
        const counts = users.reduce((acc, user) => {
            const status = user.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<User['status'], number>);
        
        return [
            { label: 'Active', value: counts.active || 0, color: '#22c55e' },
            { label: 'Pending', value: counts.pending || 0, color: '#facc15' },
            { label: 'Alerts', value: (counts.suspended || 0) + (counts.ousted || 0), color: '#ef4444' },
        ];
    }, [users]);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <DashboardStat isLoading={isSyncing} icon={<UsersIcon className="h-6 w-6"/>} title="Citizens" value={members.length} color="bg-emerald-600" glow="shadow-glow-matrix" />
                <DashboardStat isLoading={isSyncing} icon={<BriefcaseIcon className="h-6 w-6"/>} title="Facilitators" value={agents.length} color="bg-blue-600" glow="shadow-glow-blue" />
                <DashboardStat isLoading={isSyncing} icon={<ClockIcon className="h-6 w-6"/>} title="Ingress Queue" value={pendingMembers.length} color="bg-yellow-600" glow="shadow-glow-gold" />
                <DashboardStat isLoading={isSyncing} icon={<AlertTriangleIcon className="h-6 w-6"/>} title="Tribunals" value={reports.filter(r => r.status === 'new').length} color="bg-red-600" glow="shadow-red-900/50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-premium relative overflow-hidden">
                        <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Global Proclamation</h3>
                                <p className="label-caps !text-[8px] text-gray-500 mt-2">Authority Voice Protocol</p>
                            </div>
                            {isSyncing && <span className="text-[8px] font-black text-brand-gold animate-pulse tracking-widest">CONNECTING...</span>}
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!editorRef.current?.textContent?.trim()) return;
                            setIsSending(true);
                            try {
                                await onSendBroadcast(broadcastMessage);
                                setBroadcastMessage('');
                                if (editorRef.current) editorRef.current.innerHTML = '';
                            } finally { setIsSending(false); }
                        }} className="relative z-10">
                            <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/5 focus-within:ring-brand-gold/30 transition-all shadow-inner">
                                <div
                                    ref={editorRef}
                                    contentEditable="true"
                                    onInput={(e) => setBroadcastMessage(e.currentTarget.innerHTML)}
                                    data-placeholder="Enter protocol transmission..."
                                    className="w-full p-6 text-gray-200 text-lg focus:outline-none wysiwyg-editor min-h-[180px]"
                                />
                            </div>
                            <button type="submit" disabled={isSending} className="mt-6 w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-95 shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.3em] text-[10px]">
                                {isSending ? <LoaderIcon className="h-4 w-4 animate-spin mx-auto"/> : "Broadcast State Update"}
                            </button>
                        </form>
                    </div>

                    <div className="module-frame bg-slate-950/80 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                         <h4 className="label-caps !text-[9px] text-gray-500 mb-6">Recent Proclamations</h4>
                         <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                            {broadcasts.length > 0 ? broadcasts.map(b => (
                                <div key={b.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.04] transition-all">
                                    <div className="text-sm text-gray-300 wysiwyg-content" dangerouslySetInnerHTML={{ __html: b.message }} />
                                    <p className="text-[8px] text-gray-600 font-black uppercase mt-3 tracking-widest">{new Date(b.date).toLocaleString()}</p>
                                </div>
                            )) : <p className="text-center py-10 text-gray-700 uppercase font-black tracking-widest text-[9px]">No historical transmissions found</p>}
                         </div>
                    </div>
                </div>
                
                 <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-[3rem] flex flex-col items-center shadow-premium relative overflow-hidden h-fit">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/[0.02] to-transparent pointer-events-none"></div>
                    <h3 className="text-sm font-black text-gray-500 mb-8 uppercase tracking-[0.3em] relative z-10">Consensus Map</h3>
                    <div className="relative z-10">
                        <DonutChart 
                            data={isSyncing ? [] : userStatusData}
                            centerText={<><div className="text-4xl font-black text-white tracking-tighter">{isSyncing ? '...' : users.length}</div><div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nodes</div></>}
                        />
                    </div>
                    <div className="mt-10 w-full space-y-4 relative z-10">
                        {userStatusData.map(item => (
                            <div key={item.label} className="flex justify-between items-center group">
                                <span className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">
                                    <div className="w-2 h-2 rounded-full mr-3 shadow-glow-matrix" style={{backgroundColor: item.color}}></div>
                                    {item.label}
                                </span>
                                <span className="font-mono font-bold text-white text-sm">{isSyncing ? '...' : item.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-10 border-t border-white/5 w-full space-y-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20"><DatabaseIcon className="h-4 w-4"/></div>
                            <div>
                                <p className="text-[8px] text-gray-500 font-black uppercase">Blockchain Mirror</p>
                                <p className="text-xs font-black text-white uppercase">State_Finalized</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-brand-gold/10 rounded-lg text-brand-gold border border-brand-gold/20"><ClockIcon className="h-4 w-4"/></div>
                            <div>
                                <p className="text-[8px] text-gray-500 font-black uppercase">Next Conclave</p>
                                <p className="text-xs font-black text-white uppercase">May 2025</p>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};
