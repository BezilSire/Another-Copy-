import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Added Distribution to type imports
import { MemberUser, Venture, Distribution, VentureEquityHolding, User } from '../types';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { formatTimeAgo } from '../utils';
import { VeqRedemptionModal } from './VeqRedemptionModal';

interface VentureHoldingCardProps {
    holding: VentureEquityHolding;
    user: User;
    onRedeem: (holding: VentureEquityHolding) => void;
}

const VentureHoldingCard: React.FC<VentureHoldingCardProps> = ({ holding, user, onRedeem }) => {
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
                    // FIX: Pass user.id instead of the full user object
                    const userDists = await api.getDistributionsForUserInVenture(user.id, holding.ventureId, holding.shares, ventureDetails.totalSharesIssued);
                    setDistributions(userDists);
                }
            } catch (error) {
                console.error(`Failed to fetch details for venture ${holding.ventureId}`, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [holding.ventureId, holding.shares, user.id]);

    const equityPercentage = venture && venture.totalSharesIssued > 0 ? (holding.shares / venture.totalSharesIssued) * 100 : 0;
    
    const userTotalDistributed = useMemo(() => {
        if (!venture || venture.totalSharesIssued === 0) return 0;
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
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 capitalize">{venture.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{venture.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
                    <div><p className="text-xs text-gray-400">Shares</p><p className="text-lg font-bold text-white">{holding.shares.toLocaleString()}</p></div>
                    <div><p className="text-xs text-gray-400">Equity</p><p className="text-lg font-bold text-white">{equityPercentage.toFixed(2)}%</p></div>
                    <div><p className="text-xs text-gray-400">Distributed</p><p className="text-lg font-bold text-white">${userTotalDistributed.toFixed(2)}</p></div>
                    <div><p className="text-xs text-gray-400">Projected Value</p><p className="text-lg font-bold text-white">${projectedValue.toFixed(2)}</p></div>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-700 text-right">
                    <button onClick={() => onRedeem(holding)} className="px-4 py-2 bg-slate-700 text-white text-sm rounded-md hover:bg-slate-600">
                        Request Redemption
                    </button>
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
                            const userShare = venture.totalSharesIssued > 0 ? (dist.totalAmount / venture.totalSharesIssued) * holding.shares : 0;
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

interface InvestmentsPageProps {
  user: MemberUser;
  onViewProfile: (userId: string) => void;
  onNavigateToMarketplace: () => void;
}

export const MyInvestmentsPage: React.FC<InvestmentsPageProps> = ({ user, onNavigateToMarketplace }) => {
  const holdings = user.ventureEquity || [];
  const [redeemModalHolding, setRedeemModalHolding] = useState<VentureEquityHolding | null>(null);

  return (
    <div className="space-y-6">
        {redeemModalHolding && (
            <VeqRedemptionModal 
                isOpen={!!redeemModalHolding}
                onClose={() => setRedeemModalHolding(null)}
                holding={redeemModalHolding}
                user={user}
            />
        )}
      <h1 className="text-3xl font-bold text-white">My Investments (VEQ)</h1>
      
      <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 space-y-3">
        <h2 className="text-lg font-semibold text-gray-200">What is Venture Equity (VEQ)?</h2>
        <p className="text-sm text-gray-400">
            Venture Equity (VEQ) represents your direct ownership stake—in the form of shares—in community-led businesses launched through the Ubuntium platform. It's the primary way to turn your contributions into long-term, wealth-generating assets.
        </p>
        <h3 className="text-md font-semibold text-gray-300 pt-2 border-t border-slate-800">How do you earn VEQ?</h3>
        <p className="text-sm text-gray-400">
            The primary way to acquire VEQ is by investing your <strong>Civic Capital (CCAP)</strong> into ventures listed on the Venture Marketplace. This option becomes available during the bi-monthly <strong>Redemption Cycle</strong>. When you choose to invest, your CCAP is converted into shares in the venture of your choice, solidifying your stake in its success.
        </p>
        <h3 className="text-md font-semibold text-gray-300 pt-2 border-t border-slate-800">What happens when you invest?</h3>
        <p className="text-sm text-gray-400">
            The CCAP you invest is consumed and transferred to the venture's funding pool. In exchange, you receive a corresponding number of VEQ shares. As the venture becomes operational and generates profit, a portion of those profits is distributed back to you and other shareholders, providing a potential return on your investment. This creates a powerful cycle where your civic contributions fuel economic growth that you directly benefit from.
        </p>
      </div>

       <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <h2 className="text-lg font-semibold text-white">Grow Your Portfolio</h2>
                <p className="text-sm text-gray-300 mt-1">Explore new community ventures seeking funding and convert your CCAP into long-term assets.</p>
            </div>
            <button onClick={onNavigateToMarketplace} className="w-full sm:w-auto flex-shrink-0 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                Explore the Marketplace
            </button>
        </div>

      {holdings.length > 0 ? (
        <div className="space-y-4">
            {holdings.map(holding => (
                <VentureHoldingCard key={holding.ventureId} holding={holding} user={user} onRedeem={setRedeemModalHolding} />
            ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-800 rounded-lg">
            <TrendingUpIcon className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <h3 className="font-semibold text-lg text-white">You have no Venture Equity yet.</h3>
            <p className="text-gray-400 max-w-md mx-auto mt-1">Visit the Venture Marketplace to invest your CCAP in community projects and start building your VEQ portfolio.</p>
        </div>
      )}
    </div>
  );
};