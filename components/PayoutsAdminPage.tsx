import React, { useState, useEffect } from 'react';
import { PayoutRequest } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
    switch (status) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-800 text-yellow-300`}>Pending</span>;
        case 'completed': return <span className={`${baseClasses} bg-green-800 text-green-300`}>Completed</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-800 text-red-300`}>Rejected</span>;
        default: return null;
    }
};

interface PayoutsAdminPageProps {
    payouts: PayoutRequest[];
}

export const PayoutsAdminPage: React.FC<PayoutsAdminPageProps> = ({ payouts }) => {
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');
    const { addToast } = useToast();
    
    const handleUpdateStatus = async (payoutId: string, status: 'completed' | 'rejected') => {
        const confirmAction = window.confirm(`Are you sure you want to mark this request as ${status}?`);
        if (!confirmAction) return;
        
        try {
            await api.updatePayoutStatus(payoutId, status);
            addToast(`Request marked as ${status}.`, 'success');
        } catch {
            addToast('Failed to update request status.', 'error');
        }
    };

    const filteredRequests = payouts.filter(r => filter === 'all' || r.status === filter);

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Manage Payouts</h2>
            
            <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg mb-4 max-w-xs">
                <button onClick={() => setFilter('pending')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'pending' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Pending</button>
                <button onClick={() => setFilter('all')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>All</button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead>
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Status</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">User</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Ecocash Details</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Amount / Asset</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Type</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Requested</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredRequests.map(req => (
                            <tr key={req.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0"><PayoutStatusBadge status={req.status} /></td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-white">{req.userName}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                                    <div>{req.ecocashName}</div>
                                    <div className="font-mono">{req.ecocashNumber}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">
                                    {req.type === 'veq_redemption' ? `${req.amount.toLocaleString()} Shares` : `$${req.amount.toFixed(2)}`}
                                    {req.meta?.ventureName && <div className="text-xs">({req.meta.ventureName})</div>}
                                </td>
                                 <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 capitalize">{(req.type || 'referral').replace(/_/g, ' ')}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{formatTimeAgo(req.requestedAt.toDate().toISOString())}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                                    {req.status === 'pending' && (
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => handleUpdateStatus(req.id, 'completed')} className="text-green-400 hover:text-green-300 font-semibold">Complete</button>
                                            <button onClick={() => handleUpdateStatus(req.id, 'rejected')} className="text-red-400 hover:text-red-300 font-semibold">Reject</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRequests.length === 0 && (
                    <p className="text-center py-8 text-gray-500">No {filter} requests found.</p>
                )}
            </div>
        </div>
    );
};