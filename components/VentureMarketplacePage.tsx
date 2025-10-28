import React, { useState, useEffect } from 'react';
import { User, Venture } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { formatTimeAgo } from '../utils';
import { ConfirmationDialog } from './ConfirmationDialog';
import { TrashIcon } from './icons/TrashIcon';

interface VentureMarketplaceCardProps {
    venture: Venture;
    onClick: () => void;
}

const VentureMarketplaceCard: React.FC<VentureMarketplaceCardProps> = ({ venture, onClick }) => {
    const fundingProgress = (venture.fundingGoalCcap / venture.fundingGoalCcap) * 100;

    return (
        <div onClick={onClick} className="w-full h-full bg-slate-800 p-5 rounded-lg shadow-md hover:bg-slate-700/50 hover:ring-2 hover:ring-green-500 transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white">{venture.name}</h3>
                    <div className="flex items-center space-x-1 text-xs text-yellow-300 font-semibold" title="Impact Score">
                        <SparkleIcon className="h-4 w-4" />
                        <span>{venture.impactAnalysis.score}/10</span>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-1">Proposed by {venture.ownerName}</p>
                <p className="text-sm text-gray-300 line-clamp-2 mt-3">{venture.description}</p>
            </div>
            <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-gray-400 mb-1">
                    <span>Funding Goal</span>
                    <span>{fundingProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${fundingProgress}%` }}></div>
                </div>
                 <div className="flex justify-between text-xs font-mono text-gray-500 mt-1">
                    <span>{venture.fundingRaisedCcap.toLocaleString()} CCAP</span>
                     <span>{venture.fundingGoalCcap.toLocaleString()} CCAP</span>
                </div>
            </div>
        </div>
    );
};

const VentureStatusBadge: React.FC<{ status: Venture['status'] }> = ({ status }) => {
  const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
  const styles: {[key: string]: string} = {
    fundraising: 'bg-blue-800 text-blue-300',
    operational: 'bg-green-800 text-green-300',
    fully_funded: 'bg-purple-800 text-purple-300',
    completed: 'bg-slate-700 text-slate-300',
    on_hold: 'bg-orange-800 text-orange-300',
    pending_approval: 'bg-yellow-800 text-yellow-300', // Backward compatibility
  };
  const style = styles[status as string] || 'bg-gray-700 text-gray-300';
  return <span className={`${base} ${style}`}>{status.replace(/_/g, ' ')}</span>;
};

const MyVentureStatusCard: React.FC<{ venture: Venture, onDelete: (venture: Venture) => void }> = ({ venture, onDelete }) => {
    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
            <div>
                <h4 className="font-bold text-white">{venture.name}</h4>
                <p className="text-xs text-gray-400">Submitted {formatTimeAgo(venture.createdAt.toDate().toISOString())}</p>
            </div>
            <div className="flex items-center space-x-4">
                <VentureStatusBadge status={venture.status} />
                {(venture.status === 'fundraising' || (venture.status as string) === 'pending_approval') && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(venture); }}
                        className="text-red-500 hover:text-red-400"
                        title="Delete Venture"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};


interface VentureMarketplacePageProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
}

export const VentureMarketplacePage: React.FC<VentureMarketplacePageProps> = ({ currentUser, onViewProfile }) => {
    const [ventures, setVentures] = useState<Venture[]>([]);
    const [myVentures, setMyVentures] = useState<Venture[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const [deletingVenture, setDeletingVenture] = useState<Venture | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubMyVentures = api.listenForUserVentures(currentUser.id, setMyVentures, (err) => {
            console.error("Could not load user's ventures:", err)
        });

        const unsubMarketplace = api.listenForFundraisingVentures((data) => {
            setVentures(data);
            setIsLoading(false);
        }, (err) => {
            addToast("Could not load ventures from the marketplace.", "error");
            console.error(err);
            setIsLoading(false);
        });
            
        return () => {
            unsubMyVentures();
            unsubMarketplace();
        }
    }, [currentUser.id, addToast]);
    
    // For now, clicking a card will view the owner's profile. A dedicated venture details page can be a future enhancement.
    const handleSelectVenture = (venture: Venture) => {
        onViewProfile(venture.ownerId);
    };

    const handleConfirmDelete = async () => {
        if (!deletingVenture) return;
        try {
            await api.deleteVenture(currentUser, deletingVenture.id);
            addToast("Venture deleted successfully.", 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to delete venture.', 'error');
        } finally {
            setDeletingVenture(null);
        }
    };

    return (
        <div className="space-y-6">
            {myVentures.length > 0 && (
                <div className="bg-slate-800 p-5 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-white mb-4">My Venture Submissions</h2>
                    <div className="space-y-2">
                        {myVentures.map(v => <MyVentureStatusCard key={v.id} venture={v} onDelete={setDeletingVenture} />)}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
            ) : ventures.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {ventures.map(venture => (
                        <VentureMarketplaceCard key={venture.id} venture={venture} onClick={() => handleSelectVenture(venture)} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
                    <BriefcaseIcon className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <p className="font-semibold text-lg text-white">The Marketplace is Quiet</p>
                    <p>There are no community ventures seeking funding at this time. Check back soon!</p>
                </div>
            )}
             <ConfirmationDialog
                isOpen={!!deletingVenture}
                onClose={() => setDeletingVenture(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Venture"
                message={`Are you sure you want to permanently delete "${deletingVenture?.name}"? This action cannot be undone.`}
                confirmButtonText="Delete"
            />
        </div>
    );
};

// A local SparkleIcon to avoid circular dependencies or prop-drilling issues
const SparkleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2l2.35 7.16h7.65l-6.18 4.44 2.36 7.16L12 16.32l-6.18 4.44 2.36-7.16-6.18-4.44h7.65L12 2zM5 3v4M19 17v4M3 5h4M17 19h4" 
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);