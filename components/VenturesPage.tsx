import React from 'react';
import { User } from '../types';
import { VentureMarketplacePage } from './VentureMarketplacePage';
import { SparkleIcon } from './icons/SparkleIcon';

interface VenturesPageProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onNavigateToPitchAssistant: () => void;
}

export const VenturesPage: React.FC<VenturesPageProps> = (props) => {
    const { onNavigateToPitchAssistant } = props;

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg border-2 border-dashed border-slate-700 hover:border-green-500 transition-all duration-300">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                        <SparkleIcon className="h-16 w-16 text-green-400" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-white">AI Venture Pitch Assistant</h2>
                        <p className="text-gray-300 mt-2">
                            Have a business idea? Let our AI assistant help you build a detailed plan, analyze your market, and generate a professional pitch deck to attract collaborators and investors.
                        </p>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto">
                        <button 
                            onClick={onNavigateToPitchAssistant}
                            className="w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-lg"
                        >
                            Start Building
                        </button>
                    </div>
                </div>
            </div>

             <div className="animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-4">Venture Marketplace</h3>
                <VentureMarketplacePage {...props} />
            </div>
        </div>
    );
};
