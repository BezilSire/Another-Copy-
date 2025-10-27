import React, { useState, useEffect } from 'react';
import { User, Proposal } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ProposalCardProps {
    proposal: Proposal;
    currentUser: User;
    onVote: (proposalId: string, vote: 'for' | 'against') => void;
    onSelect: () => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, currentUser, onVote, onSelect }) => {
    const [isVoting, setIsVoting] = useState(false);

    const userVote = proposal.votesFor.includes(currentUser.id) ? 'for' : proposal.votesAgainst.includes(currentUser.id) ? 'against' : null;

    const totalVotes = proposal.voteCountFor + proposal.voteCountAgainst;
    const forPercentage = totalVotes > 0 ? (proposal.voteCountFor / totalVotes) * 100 : 0;

    const handleVote = async (vote: 'for' | 'against') => {
        setIsVoting(true);
        try {
            await onVote(proposal.id, vote);
        } finally {
            setIsVoting(false);
        }
    };
    
    const statusPill = {
        active: 'bg-blue-500/20 text-blue-300',
        passed: 'bg-green-500/20 text-green-300',
        failed: 'bg-red-500/20 text-red-300',
        closed: 'bg-slate-600/50 text-slate-300',
    };

    return (
        <div className="bg-slate-800 p-5 rounded-lg shadow-lg border border-slate-700">
            <div className="flex justify-between items-start">
                 <button onClick={onSelect} className="text-left">
                    <h3 className="text-xl font-bold text-white mb-2 hover:underline">{proposal.title}</h3>
                </button>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusPill[proposal.status]}`}>{proposal.status}</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Created on {proposal.createdAt.toDate().toLocaleDateString()}</p>
            
            <div className="text-gray-300 line-clamp-3 mb-2">
                <MarkdownRenderer content={proposal.description} />
            </div>
             <button onClick={onSelect} className="text-green-400 text-sm hover:underline mb-4">
                View Details & Discussion...
            </button>

            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-400">{proposal.voteCountFor} Votes For</span>
                    <span className="text-red-400">{proposal.voteCountAgainst} Votes Against</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 flex overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${forPercentage}%` }} title={`${forPercentage.toFixed(1)}% For`}></div>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-700">
                {userVote ? (
                    <div className="flex items-center justify-center space-x-2 text-lg font-semibold">
                       {userVote === 'for' ? <CheckCircleIcon className="h-6 w-6 text-green-400" /> : <XCircleIcon className="h-6 w-6 text-red-400" />}
                        <span>You voted {userVote.toUpperCase()}</span>
                    </div>
                ) : proposal.status === 'active' ? (
                    <div className="flex items-center justify-center space-x-4">
                        <button disabled={isVoting} onClick={() => handleVote('for')} className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold disabled:bg-slate-600">Vote For</button>
                        <button disabled={isVoting} onClick={() => handleVote('against')} className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold disabled:bg-slate-600">Vote Against</button>
                    </div>
                ) : (
                    <p className="text-center text-gray-400 font-semibold">Voting on this proposal is closed.</p>
                )}
            </div>
        </div>
    );
};


interface ProposalsPageProps {
  currentUser: User;
  onNavigateToDetails: (proposalId: string) => void;
}

export const ProposalsPage: React.FC<ProposalsPageProps> = ({ currentUser, onNavigateToDetails }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'closed'>('active');
  const { addToast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = api.listenForProposals((data) => {
        setProposals(data);
        setIsLoading(false);
    }, (error) => {
        addToast('Could not load proposals.', 'error');
        console.error(error);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [addToast]);
  
  const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
      try {
          await api.voteOnProposal(proposalId, currentUser.id, vote);
          addToast("Your vote has been cast!", 'success');
      } catch (error) {
          if (error instanceof Error && error.message.includes("already voted")) {
              addToast("You have already voted on this proposal.", "info");
          } else {
              addToast("Failed to cast vote.", "error");
          }
      }
  };
  
  const filteredProposals = proposals.filter(p => {
    if (filter === 'active') return p.status === 'active';
    return p.status !== 'active';
  });

  return (
    <div className="space-y-6">
        <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setFilter('active')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'active' ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-700/50'}`}>Active Proposals</button>
            <button onClick={() => setFilter('closed')} className={`w-full px-4 py-2 text-sm font-medium rounded-md ${filter === 'closed' ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-700/50'}`}>Archived</button>
        </div>

        {isLoading ? (
             <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
        ) : filteredProposals.length > 0 ? (
            <div className="space-y-4">
                {filteredProposals.map(proposal => (
                    <ProposalCard key={proposal.id} proposal={proposal} currentUser={currentUser} onVote={handleVote} onSelect={() => onNavigateToDetails(proposal.id)}/>
                ))}
            </div>
        ) : (
            <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
                <p className="font-semibold text-lg text-white">No {filter} proposals</p>
                <p>Check back later for new proposals to vote on.</p>
            </div>
        )}
    </div>
  );
};