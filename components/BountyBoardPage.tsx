import React, { useState, useEffect } from 'react';
// FIX: Import the missing Bounty type.
import { User, Bounty } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { formatTimeAgo } from '../utils';

interface BountyCardProps {
    bounty: Bounty;
    onAccept: (bountyId: string) => void;
    isAccepting: boolean;
}

const BountyCard: React.FC<BountyCardProps> = ({ bounty, onAccept, isAccepting }) => {
    return (
        <div className="bg-slate-800 p-5 rounded-lg shadow-lg border border-slate-700">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-white mb-2">{bounty.title}</h3>
                <span className="text-lg font-mono text-blue-400 font-bold">{bounty.reward} CCAP</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">Posted by {bounty.creatorName} &bull; {formatTimeAgo(bounty.createdAt.toDate().toISOString())}</p>
            <p className="text-gray-300 line-clamp-3 mb-3">{bounty.description}</p>
            <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-1">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                    {bounty.requiredSkills.map(skill => (
                        <span key={skill} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs">{skill}</span>
                    ))}
                </div>
            </div>
            <div className="text-right">
                <button 
                    onClick={() => onAccept(bounty.id)}
                    disabled={isAccepting}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600"
                >
                    {isAccepting ? 'Accepting...' : 'Accept Bounty'}
                </button>
            </div>
        </div>
    );
};

interface BountyBoardPageProps {
  user: User;
  onNavigateToCreate: () => void;
}

export const BountyBoardPage: React.FC<BountyBoardPageProps> = ({ user, onNavigateToCreate }) => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = api.listenForOpenBounties(setBounties, (err) => {
        addToast("Failed to load bounties.", "error");
        console.error(err);
    });
    setIsLoading(false);
    return () => unsubscribe();
  }, [addToast]);

  const handleAccept = async (bountyId: string) => {
    setIsAccepting(bountyId);
    try {
        await api.acceptBounty(user, bountyId);
        addToast("Bounty accepted! It's now in your assigned tasks.", "success");
    } catch (error) {
        addToast("Failed to accept bounty.", "error");
    } finally {
        setIsAccepting(null);
    }
  };

  return (
    <div className="space-y-6">
         <div className="bg-slate-800 p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white">Bounty Board</h1>
                <p className="text-gray-400 mt-1">Complete tasks for the community and earn CCAP.</p>
            </div>
            <button onClick={onNavigateToCreate} className="w-full sm:w-auto flex-shrink-0 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                Post a Bounty
            </button>
        </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
      ) : bounties.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bounties.map(bounty => (
            <BountyCard key={bounty.id} bounty={bounty} onAccept={handleAccept} isAccepting={isAccepting === bounty.id} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-