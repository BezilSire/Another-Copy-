import React, { useState, useEffect } from 'react';
import { Agent, User, PayoutRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { api } from '../services/apiService';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';

interface AgentProfileProps {
  agent: Agent;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
}

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
    switch (status) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-800 text-yellow-300`}>Pending</span>;
        case 'completed': return <span className={`${baseClasses} bg-green-800 text-green-300`}>Completed</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-800 text-red-300`}>Rejected</span>;
        default: return null;
    }
};

export const AgentProfile: React.FC<AgentProfileProps> = ({ agent, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: agent.name,
    email: agent.email,
    circle: agent.circle,
    phone: agent.phone || '',
    id_card_number: agent.id_card_number || '',
    address: agent.address || '',
    bio: agent.bio || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();
  
  const [payoutData, setPayoutData] = useState({ ecocashName: '', ecocashNumber: '' });
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

  useEffect(() => {
    // Sync form data if the agent prop changes (e.g., after a save)
    setFormData({
        name: agent.name,
        email: agent.email,
        circle: agent.circle,
        phone: agent.phone || '',
        id_card_number: agent.id_card_number || '',
        address: agent.address || '',
        bio: agent.bio || '',
    });

    const unsub = api.listenForUserPayouts(agent.id, setPayouts, console.error);
    return () => unsub();
  }, [agent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Simple validation
      if (!formData.name.trim() || !formData.email.trim() || !formData.circle.trim()) {
        addToast('Name, email, and circle cannot be empty.', 'error');
        setIsSaving(false);
        return;
      }
      await onUpdateUser({ 
        name: formData.name, 
        circle: formData.circle,
        phone: formData.phone,
        id_card_number: formData.id_card_number,
        address: formData.address,
        bio: formData.bio,
      });
      // The parent component handles success toast
    } catch (error) {
      addToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = agent.commissionBalance || 0;
    if (amount <= 0) {
        addToast('No commission balance to withdraw.', 'info');
        return;
    }
    if (!payoutData.ecocashName || !payoutData.ecocashNumber) {
        addToast('Please provide your Ecocash details.', 'error');
        return;
    }
    setIsRequestingPayout(true);
    try {
        await api.requestCommissionPayout(agent, payoutData.ecocashName, payoutData.ecocashNumber, amount);
        // User balance will update via snapshot listener
        addToast('Payout request submitted successfully!', 'success');
        setPayoutData({ ecocashName: '', ecocashNumber: '' });
    } catch (error) {
        addToast(error instanceof Error ? error.message : "Failed to request payout.", "error");
    } finally {
        setIsRequestingPayout(false);
    }
  };
  
  const hasChanges = formData.name !== agent.name || 
                     formData.email !== agent.email || 
                     formData.circle !== agent.circle ||
                     formData.phone !== (agent.phone || '') ||
                     formData.id_card_number !== (agent.id_card_number || '') ||
                     formData.address !== (agent.address || '') ||
                     formData.bio !== (agent.bio || '');

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in max-w-2xl mx-auto">
       <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-4">
            <div>
                <h2 className="text-2xl font-semibold text-white">Your Profile</h2>
            </div>
            <div className="relative group flex items-center gap-1" title="Knowledge Points">
                <BookOpenIcon className="h-4 w-4 text-blue-400" />
                <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-blue-400">
                    {agent.knowledgePoints ?? 0}
                </span>
            </div>
        </div>
      
      <ProfileCompletionMeter profileData={formData} role="agent" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              readOnly
              className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md shadow-sm text-gray-400 sm:text-sm"
            />
             <p className="mt-2 text-xs text-gray-500">Email cannot be changed after registration.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number</label>
              <input
                type="tel"
                name="phone"
                id="phone"
                placeholder="+256 772 123456"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="id_card_number" className="block text-sm font-medium text-gray-300">ID Card Number</label>
              <input
                type="text"
                name="id_card_number"
                id="id_card_number"
                placeholder="National ID or Passport"
                value={formData.id_card_number}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
        </div>
        
        <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
            <textarea
              name="address"
              id="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Ubuntu Lane, Kampala, Uganda"
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
        </div>

        <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio</label>
            <textarea
              name="bio"
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell the community a little about yourself..."
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300">Agent Code</label>
            <p className="mt-1 text-gray-400 font-mono p-2 bg-slate-900 rounded-md">{agent.agent_code}</p>
          </div>
          <div>
            <label htmlFor="circle" className="block text-sm font-medium text-gray-300">Circle</label>
            <input
              type="text"
              name="circle"
              id="circle"
              value={formData.circle}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:bg-slate-500 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-medium text-gray-200 flex items-center mb-4">
            <DollarSignIcon className="h-5 w-5 mr-2" />
            Commission Earnings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Available Balance</p>
                <p className="text-3xl font-bold text-green-400">${(agent.commissionBalance || 0).toFixed(2)}</p>
                {(agent.commissionBalance || 0) > 0 && (
                    <form onSubmit={handlePayoutRequest} className="mt-4 space-y-3">
                        <input type="text" value={payoutData.ecocashName} onChange={e => setPayoutData(p => ({...p, ecocashName: e.target.value}))} placeholder="Ecocash Full Name" required className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        <input type="tel" value={payoutData.ecocashNumber} onChange={e => setPayoutData(p => ({...p, ecocashNumber: e.target.value}))} placeholder="Ecocash Phone Number" required className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        <button type="submit" disabled={isRequestingPayout} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                            {isRequestingPayout ? 'Processing...' : `Request Payout`}
                        </button>
                    </form>
                )}
              </div>
              <div>
                <h4 className="text-md font-semibold text-gray-300 mb-2">Payout History</h4>
                 {payouts.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {payouts.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-gray-200">
                                       ${p.amount.toFixed(2)} - {p.type}
                                    </p>
                                    <p className="text-xs text-gray-400">{formatTimeAgo(p.requestedAt.toDate().toISOString())}</p>
                                </div>
                                <PayoutStatusBadge status={p.status} />
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-gray-500">No payout history.</p>}
              </div>
          </div>
      </div>


      <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-medium text-gray-200 flex items-center">
            <HelpCircleIcon className="h-5 w-5 mr-2" />
            Help & Support
          </h3>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-lg">
              <p className="text-sm text-gray-300">Have questions or need assistance? Contact our support team.</p>
              <a href="mailto:support@globalcommons.app" className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500">
                Contact Support
              </a>
          </div>
      </div>

    </div>
  );
};
