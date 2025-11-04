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
             <div className="animate-fade-in">
                <div className="bg-gradient-to-r from-green-600 to-blue-500 p-6 rounded-lg shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center"><SparkleIcon className="h-6 w-6 mr-2"/> AI Venture Pitch Assistant</h3>
                        <p className="text-gray-200 mt-1">Have a business idea? Let our AI help you build a detailed plan and pitch deck in minutes.</p>
                    </div>
                    <button 
                        onClick={onNavigateToPitchAssistant}
                        className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-200 font-semibold"
                    >
                        Start Building
                    </button>
                </div>

                <h3 className="text-2xl font-bold text-white">Venture Marketplace</h3>
                <p className="text-gray-400 mb-6 max-w-2xl">Explore community-led ventures seeking funding or create your own with the help of our AI Pitch Assistant.</p>
                <VentureMarketplacePage {...props} />
            </div>
        </div>
    );
};