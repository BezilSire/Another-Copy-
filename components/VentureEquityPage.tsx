import React, { useState, useEffect, useMemo } from 'react';
import { MemberUser, Venture, Distribution, VentureEquityHolding } from '../types';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { formatTimeAgo } from '../utils';

interface VentureHoldingCardProps {
    holding: VentureEquityHolding;
    userId: string;
}

const VentureHoldingCard: React.FC<VentureHoldingCardProps> = ({ holding, userId }) => {
    const [venture, setVenture] = useState<Venture | null>(null);
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // FIX: Corrected API call from getVentureDetails to getVentureById
                const ventureDetails = await api.getVentureById(holding.ventureId);
                setVenture(ventureDetails);
                if (ventureDetails) {
                    const userDists = await api.getDistributionsForUserInVenture(userId, holding.ventureId, holding.shares, ventureDetails.totalSharesIssued);
                    setDistributions(userDists);
                }
            } catch (error) {
                console.error(`Failed to fetch details for venture ${holding.ventureId}`, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [holding, userId]);

    const equityPercentage = venture ? (holding.shares / venture.totalSharesIssued) * 100 : 0;
    
    const userTotalDistributed = useMemo(() => {
        if (!venture) return 0;
        const userShareFraction = holding.shares / venture.totalSharesIssued;
        return distributions.reduce((sum, dist) => sum + (dist.totalAmount * userShareFraction), 0);
    }, [distributions, venture, holding.shares]);
    
    // A simple projection. This could be more complex in a real scenario.
    const projectedValue = userTotalDistributed * 1.5;

    if (isLoading) {
        return <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-center min-h-[150px]"><LoaderIcon className="h-6 w-6 animate-spin"/></div>;
    }

    if (!venture) {
        return <div className="bg-slate-800 p-4 rounded-lg text-red-400">Could not load details for {holding.ventureName}.</div>;
    }

    return (
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700">
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">{venture.name}</h3>
                        <p className="font-mono text-sm text-green-400">{holding.ventureTicker}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 capitalize">{venture.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{venture.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
                    <div><p className="text-xs text-gray-400">Shares</p><p className="text-lg font-bold text-white">{holding.shares}</p></div>
                    <div><p className="text-xs text-gray-400">Equity</p><p className="text-lg font-bold text-white">{equityPercentage.toFixed(2)}%</p></div>
                    <div><p className="text-xs text-gray-400">Distributed</p><p className="text-lg font-bold text-white">${userTotalDistributed.toFixed(2)}</p></div>
                    <div><p className="text-xs text-gray-400">Projected Value</p><p className="text-lg font-bold text-white">${projectedValue.toFixed(2)}</p></div>
                </div>
            </div>
             {distributions.length > 0 && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="w-full bg-slate-900/50 hover:bg-slate-700/50 px-4 py-2 text-xs font-semibold text-gray-300 flex justify-center items-center rounded-b-lg">
                    <span>{isExpanded ? 'Hide' : 'Show'} Distribution History</span>
                    <ChevronDownIcon className={`ml-1 h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                </button>
             )}
              {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in">
                    <ul className="space-y-2 mt-2 text-sm">
                        {distributions.map(dist => {
                            const userShare = (dist.totalAmount / venture.totalSharesIssued) * holding.shares;
                            return (
                                <li key={dist.id} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
                                    <div>
                                        <p className="font-semibold text-white">Profit Distribution</p>
                                        <p className="text-xs text-gray-400">{dist.notes} - {dist.date.toDate().toLocaleDateString()}</p>
                                    </div>
                                    <p className="font-mono text-green-400">+${userShare.toFixed(2)}</p>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

interface VentureEquityPageProps {
  user: MemberUser;
}

export const VentureEquityPage: React.FC<VentureEquityPageProps> = ({ user }) => {
  const holdings = user.ventureEquity || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">My Investments (VEQ)</h1>
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <h2 className="text-lg font-semibold text-gray-200">What is Venture Equity (VEQ)?</h2>
        <p className="text-sm text-gray-400 mt-1">VEQ represents your direct ownership stake in ventures created within the Ubuntium Commons. You earn it by proposing successful projects or contributing your skills. As these ventures generate profit, a portion is distributed to you based on the shares you hold.</p>
      </div>

      {holdings.length > 0 ? (
        <div className="space-y-4">
            {holdings.map(holding => (
                <VentureHoldingCard key={holding.ventureId} holding={holding} userId={user.id} />
            ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-800 rounded-lg">
            <TrendingUpIcon className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <h3 className="font-semibold text-lg text-white">You have no Venture Equity yet.</h3>
            <p className="text-gray-400 max-w-md mx-auto mt-1">Propose a venture or contribute to a community project to earn VEQ and own a piece of the new economy.</p>
        </div>
      )}
    </div>
  );
};