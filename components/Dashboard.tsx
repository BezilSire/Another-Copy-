import React, { useState, useMemo, useRef } from 'react';
import { Admin, User, Member, Agent, Report, Broadcast, Activity, PayoutRequest, Venture, CommunityValuePool } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ClockIcon } from './icons/ClockIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { DonutChart } from './DonutChart';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';

interface DashboardProps {
    user: Admin;
    users: User[];
    members: Member[];
    agents: Agent[];
    pendingMembers: Member[];
    reports: Report[];
    broadcasts: Broadcast[];
    payouts: PayoutRequest[];
    ventures: Venture[];
    cvp: CommunityValuePool | null;
    onSendBroadcast: (message: string) => Promise<void>;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; description?: string; }> = ({ icon, title, value, description }) => (
  <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex items-start h-full">
    <div className="flex-shrink-0 bg-slate-700 rounded-md p-3">{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-400 truncate">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = (props) => {
    const { users, members, agents, pendingMembers, reports, cvp, onSendBroadcast } = props;
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const newReportsCount = useMemo(() => reports.filter(r => r.status === 'new').length, [reports]);

    const userStatusData = useMemo(() => {
        const counts = users.reduce((acc, user) => {
            const status = user.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<User['status'], number>);
        
        return [
            { label: 'Active', value: counts.active || 0, color: '#22c55e' }, // green-500
            { label: 'Pending', value: counts.pending || 0, color: '#facc15' }, // yellow-400
            { label: 'Suspended', value: counts.suspended || 0, color: '#f97316' }, // orange-500
            { label: 'Ousted', value: counts.ousted || 0, color: '#ef4444' }, // red-500
        ];
    }, [users]);
    
    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editorRef.current?.textContent?.trim()) return;
        setIsSending(true);
        try {
            await onSendBroadcast(broadcastMessage);
            setBroadcastMessage('');
            if (editorRef.current) editorRef.current.innerHTML = '';
        } finally {
            setIsSending(false);
        }
    };
    
     const handleBroadcastInput = (e: React.FormEvent<HTMLDivElement>) => {
        setBroadcastMessage(e.currentTarget.innerHTML);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<UsersIcon className="h-6 w-6 text-green-400" />} title="Total Members" value={members.length} />
                <StatCard icon={<BriefcaseIcon className="h-6 w-6 text-green-400" />} title="Total Agents & Creators" value={agents.length} />
                <StatCard icon={<ClockIcon className="h-6 w-6 text-yellow-400" />} title="Pending Verification" value={pendingMembers.length} />
                <StatCard icon={<AlertTriangleIcon className="h-6 w-6 text-red-400" />} title="New Reports" value={newReportsCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold text-white mb-4">Send Broadcast</h3>
                    <form onSubmit={handleSendBroadcast}>
                        <div className="border border-slate-700 rounded-md">
                            <div
                                ref={editorRef}
                                contentEditable="true"
                                onInput={handleBroadcastInput}
                                data-placeholder="Type your message to all users..."
                                className="w-full bg-slate-700 p-3 text-white text-base focus:outline-none wysiwyg-editor"
                                style={{minHeight: '120px', overflowY: 'auto'}}
                            />
                        </div>
                        <button type="submit" disabled={isSending} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-slate-500">
                            {isSending ? "Sending..." : "Send to All"}
                        </button>
                    </form>
                </div>
                 <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
                    <h3 className="text-xl font-semibold text-white mb-4">User Status</h3>
                    <DonutChart 
                        data={userStatusData}
                        centerText={<><div className="text-3xl font-bold">{users.length}</div><div className="text-sm text-gray-400">Total Users</div></>}
                    />
                    <div className="mt-4 w-full space-y-2 text-sm">
                        {userStatusData.map(item => (
                            <div key={item.label} className="flex justify-between items-center">
                                <span className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: item.color}}></div>{item.label}</span>
                                <span className="font-semibold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
};
