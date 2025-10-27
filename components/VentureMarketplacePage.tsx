import React, { useState, useEffect } from 'react';
import { User, Venture } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

interface VentureMarketplaceCardProps {
    venture: Venture;
    onClick: () => void;
}

const VentureMarketplaceCard: React.FC<VentureMarketplaceCardProps> = ({ venture, onClick }) => {
    const fundingProgress = (venture.fundingRaisedCcap / venture.fundingGoalCcap) * 100;

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


interface VentureMarketplacePageProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
}

export const VentureMarketplacePage: React.FC<VentureMarketplacePageProps> = ({ currentUser, onViewProfile }) => {
    const [ventures, setVentures] = useState<Venture[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        api.getFundraisingVentures()
            .then(setVentures)
            .catch(() => addToast("Could not load ventures from the marketplace.", "error"))
            .finally(() => setIsLoading(false));
    }, [addToast]);
    
    // For now, clicking a card will view the owner's profile. A dedicated venture details page can be a future enhancement.
    const handleSelectVenture = (venture: Venture) => {
        onViewProfile(venture.ownerId);
    };

    return (
        <div className="space-y-6">
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
