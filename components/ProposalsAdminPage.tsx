
import React, { useState, useEffect } from 'react';
import { User, Proposal } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { ProposalDetailsPage } from './ProposalDetailsPage';
import { ConfirmationDialog } from './ConfirmationDialog';

interface ProposalsAdminPageProps {
  user: User;
}

const ProposalRow: React.FC<{ proposal: Proposal, onUpdateStatus: (id: string, status: 'passed' | 'failed') => void, onSelect: (id: string) => void }> = ({ proposal, onUpdateStatus, onSelect }) => {
    const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
    const forPercentage = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (proposal.voteCountAgainst / totalVotes) * 100 : 0;

    return (
        <tr className="hover:bg-slate-700/50">
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                <button onClick={() => onSelect(proposal.id)} className="hover:underline text-left">
                    {proposal.title}
                </button>
            </td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 capitalize">{proposal.status}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{proposal.createdAt.toDate().toLocaleDateString()}</td>
            <td className="px-3 py-4 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                    <span className="text-green-400">{proposal.voteCountFor} ({forPercentage.toFixed(1)}%)</span>
                    <span>/</span>
                    <span className="text-red-400">{proposal.voteCountAgainst} ({againstPercentage.toFixed(1)}%)</span>
                </div>
            </td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                {proposal.status === 'active' && (
                    <div className="flex space-x-2">
                        <button onClick={() => onUpdateStatus(proposal.id, 'passed')} className="text-green-400 hover:underline">Pass</button>
                        <button onClick={() => onUpdateStatus(proposal.id, 'failed')} className="text-red-400 hover:underline">Fail</button>
                    </div>
                )}
            </td>
        </tr>
    );
};

export const ProposalsAdminPage: React.FC<ProposalsAdminPageProps> = ({ user }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProposal, setNewProposal] = useState({ title: '', description: '' });
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<{ id: string, status: 'passed' | 'failed' } | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = api.listenForProposals(setProposals, (err) => {
      addToast('Failed to load proposals.', 'error');
      console.error(err);
    });
    setIsLoading(false);
    return () => unsubscribe();
  }, [addToast]);
  
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposal.title.trim() || !newProposal.description.trim()) {
        addToast('Title and description are required.', 'error');
        return;
    }
    setIsSubmitting(true);
    try {
        await api.createProposal(user, newProposal);
        addToast('Proposal created successfully!', 'success');
        setNewProposal({ title: '', description: '' });
    } catch (error) {
        addToast('Failed to create proposal.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateStatusFinal = async () => {
    if (!statusChange) return;
    try {
        await api.closeProposal(user, statusChange.id, statusChange.status);
        addToast('Proposal status updated.', 'success');
    } catch (error) {
        addToast('Failed to update proposal status.', 'error');
    } finally {
        setStatusChange(null);
    }
  };

  if (selectedProposalId) {
    return <ProposalDetailsPage proposalId={selectedProposalId} currentUser={user} onBack={() => setSelectedProposalId(null)} isAdminView />;
  }

  return (
    <div className="space-y-8">
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-white mb-4">Create New Proposal</h2>
        <form onSubmit={handleCreateProposal} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">Title</label>
            <input type="text" name="title" id="title" value={newProposal.title} onChange={e => setNewProposal(p => ({...p, title: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description (Supports Markdown)</label>
            <textarea name="description" id="description" rows={6} value={newProposal.description} onChange={e => setNewProposal(p => ({...p, description: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required />
          </div>
          <div className="text-right">
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-500">
                {isSubmitting ? 'Submitting...' : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-white mb-4">Manage Proposals</h2>
        {isLoading ? <LoaderIcon className="animate-spin" /> : (
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-700">
                    <thead>
                        <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Title</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Status</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Created</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Votes (For/Against)</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {proposals.map(p => <ProposalRow key={p.id} proposal={p} onUpdateStatus={(id, status) => setStatusChange({id, status})} onSelect={setSelectedProposalId} />)}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      <ConfirmationDialog 
          isOpen={!!statusChange}
          onClose={() => setStatusChange(null)}
          onConfirm={handleUpdateStatusFinal}
          title="Update Proposal Status"
          message={`Are you sure you want to mark this proposal as ${statusChange?.status}? This action is final and will affect future distributions or rules.`}
          confirmButtonText="Update Status"
      />
    </div>
  );
};
