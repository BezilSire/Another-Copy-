import React, { useState, useEffect, useMemo } from 'react';
import { User, Venture } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';

type VentureFilter = 'pending_approval' | 'fundraising' | 'operational' | 'all';

const VentureStatusBadge: React.FC<{ status: Venture['status'] }> = ({ status }) => {
  const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
  const styles = {
    pending_approval: 'bg-yellow-800 text-yellow-300',
    fundraising: 'bg-blue-800 text-blue-300',
    operational: 'bg-green-800 text-green-300',
    fully_funded: 'bg-purple-800 text-purple-300',
    completed: 'bg-slate-700 text-slate-300',
    on_hold: 'bg-orange-800 text-orange-300',
    rejected: 'bg-red-800 text-red-300',
  };
  return <span className={`${base} ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
};

interface VenturesAdminPageProps {
    user: User;
    ventures: Venture[];
}

export const VenturesAdminPage: React.FC<VenturesAdminPageProps> = ({ user, ventures }) => {
    const [filter, setFilter] = useState<VentureFilter>('pending_approval');
    const { addToast } = useToast();

    const handleUpdateStatus = async (ventureId: string, status: 'fundraising' | 'rejected') => {
        const action = status === 'fundraising' ? 'approve' : 'reject';
        if (!window.confirm(`Are you sure you want to ${action} this venture?`)) return;
        try {
            await api.updateVentureStatus(user, ventureId, status);
            addToast(`Venture has been ${action}ed.`, 'success');
        } catch (error) {
            addToast('Failed to update venture status.', 'error');
        }
    };

    const filteredVentures = useMemo(() => {
        if (filter === 'all') return ventures;
        return ventures.filter(v => v.status === filter);
    }, [ventures, filter]);
    
    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Manage Ventures</h2>
            <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg mb-4 max-w-md">
                 <button onClick={() => setFilter('pending_approval')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'pending_approval' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Pending</button>
                 <button onClick={() => setFilter('fundraising')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'fundraising' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Active</button>
                 <button onClick={() => setFilter('operational')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'operational' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Operational</button>
                 <button onClick={() => setFilter('all')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>All</button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead>
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Venture</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Owner</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Status</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Funding Progress (CCAP)</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Created</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredVentures.map(v => (
                            <tr key={v.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">{v.name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{v.ownerName}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm"><VentureStatusBadge status={v.status} /></td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">{v.fundingRaisedCcap.toLocaleString()} / {v.fundingGoalCcap.toLocaleString()}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{formatTimeAgo(v.createdAt.toDate().toISOString())}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    {v.status === 'pending_approval' && (
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => handleUpdateStatus(v.id, 'fundraising')} className="text-green-400 hover:text-green-300 font-semibold">Approve</button>
                                            <button onClick={() => handleUpdateStatus(v.id, 'rejected')} className="text-red-400 hover:text-red-300 font-semibold">Reject</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredVentures.length === 0 && <p className="text-center py-8 text-gray-500">No ventures found for this filter.</p>}
             </div>
        </div>
    );
};