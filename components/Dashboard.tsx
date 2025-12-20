
import React, { useState, useMemo, useRef } from 'react';
import { Admin, User, Member, Agent, Report, Broadcast, PayoutRequest, Venture, CommunityValuePool } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ClockIcon } from './icons/ClockIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { DonutChart } from './DonutChart';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';

// Fix: Define DashboardProps interface
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

const DashboardStat: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string; glow: string }> = ({ icon, title, value, color, glow }) => (
  <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl transition-all hover:scale-[1.02] duration-300">
    <div className={`inline-flex p-3 rounded-2xl ${color} ${glow} mb-4 text-white`}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{title}</p>
    <p className="text-3xl font-black text-white font-mono tracking-tighter">{value}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = (props) => {
    const { users, members, agents, pendingMembers, reports, onSendBroadcast } = props;
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

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
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <DashboardStat icon={<UsersIcon className="h-6 w-6"/>} title="Members" value={members.length} color="bg-green-600" glow="shadow-glow-green" />
                <DashboardStat icon={<BriefcaseIcon className="h-6 w-6"/>} title="Agents" value={agents.length} color="bg-blue-600" glow="shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]" />
                <DashboardStat icon={<ClockIcon className="h-6 w-6"/>} title="Pending" value={pendingMembers.length} color="bg-yellow-600" glow="shadow-[0_0_15px_-3px_rgba(202,138,4,0.4)]" />
                <DashboardStat icon={<AlertTriangleIcon className="h-6 w-6"/>} title="Reports" value={reports.filter(r => r.status === 'new').length} color="bg-red-600" glow="shadow-[0_0_15px_-3px_rgba(220,38,38,0.4)]" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-premium">
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter">Global Proclamation</h3>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editorRef.current?.textContent?.trim()) return;
                        setIsSending(true);
                        try {
                            await onSendBroadcast(broadcastMessage);
                            setBroadcastMessage('');
                            if (editorRef.current) editorRef.current.innerHTML = '';
                        } finally { setIsSending(false); }
                    }}>
                        <div className="bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/5 focus-within:ring-brand-gold/30 transition-all">
                            <div
                                ref={editorRef}
                                contentEditable="true"
                                onInput={(e) => setBroadcastMessage(e.currentTarget.innerHTML)}
                                data-placeholder="What must the commons know today?"
                                className="w-full p-4 text-gray-200 text-lg focus:outline-none wysiwyg-editor min-h-[150px]"
                            />
                        </div>
                        <button type="submit" disabled={isSending} className="mt-6 w-full py-4 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-95 shadow-glow-gold disabled:opacity-50 uppercase tracking-widest text-xs">
                            {isSending ? <LoaderIcon className="h-4 w-4 animate-spin mx-auto"/> : "Dispatch Message"}
                        </button>
                    </form>
                </div>
                
                 <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center shadow-premium">
                    <h3 className="text-sm font-black text-gray-500 mb-8 uppercase tracking-[0.3em]">Network Pulse</h3>
                    <DonutChart 
                        data={userStatusData}
                        centerText={<><div className="text-4xl font-black text-white tracking-tighter">{users.length}</div><div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Citizens</div></>}
                    />
                    <div className="mt-10 w-full space-y-4">
                        {userStatusData.map(item => (
                            <div key={item.label} className="flex justify-between items-center group">
                                <span className="flex items-center text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                                    <div className="w-2 h-2 rounded-full mr-3 shadow-sm" style={{backgroundColor: item.color}}></div>
                                    {item.label}
                                </span>
                                <span className="font-mono font-bold text-white text-sm">{item.value}</span>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
};
