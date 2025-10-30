import React, { useState, useEffect } from 'react';
import { Venture, User, VentureEquityHolding } from '../types';
import { api } from '../services/apiService';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface VentureDetailsAdminProps {
  venture: Venture;
  onBack: () => void;
}

type BackerDetails = User & {
    shares: number;
};

export const VentureDetailsAdmin: React.FC<VentureDetailsAdminProps> = ({ venture, onBack }) => {
    const [backers, setBackers] = useState<BackerDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBackers = async () => {
            if (venture.backers && venture.backers.length > 0) {
                try {
                    const users = await api.getUsersByUids(venture.backers);
                    const backerDetails = users.map(user => {
                        const holding = user.ventureEquity?.find(h => h.ventureId === venture.id);
                        return { ...user, shares: holding ? holding.shares : 0 };
                    });
                    setBackers(backerDetails as BackerDetails[]);
                } catch (error) {
                    console.error("Failed to fetch backers:", error);
                }
            }
            setIsLoading(false);
        };
        fetchBackers();
    }, [venture]);
    
    const fundingProgress = venture.fundingGoalCcap > 0 ? (venture.fundingRaisedCcap / venture.fundingGoalCcap) * 100 : 0;

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="inline-flex items-center text-sm font-medium text-green-400 hover:text-green-300">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Ventures List
            </button>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-white">{venture.name}</h1>
                <p className="text-sm text-gray-400">by {venture.ownerName}</p>

                <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-gray-400 mb-1">
                        <span>Funding Progress</span>
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

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Investors ({backers.length})</h2>
                {isLoading ? (
                     <div className="flex justify-center p-8"><LoaderIcon className="h-8 w-8 animate-spin" /></div>
                ) : backers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead>
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Investor Name</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Shares (VEQ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {backers.map(backer => (
                                    <tr key={backer.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">{backer.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">{backer.shares.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">This venture has no investors yet.</p>
                )}
            </div>
        </div>
    );
};