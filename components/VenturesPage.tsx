import React, { useState } from 'react';
import { User } from '../types';
import { VentureCollaboratorsPage } from './VentureCollaboratorsPage';
import { VentureMarketplacePage } from './VentureMarketplacePage';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { UsersIcon } from './icons/UsersIcon';

type VenturesTab = 'marketplace' | 'collaborators';

interface VenturesPageProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onNavigateToPitchAssistant: () => void;
}

const TabButton: React.FC<{label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void}> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
        {icon}
        <span>{label}</span>
    </button>
);


export const VenturesPage: React.FC<VenturesPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<VenturesTab>('marketplace');

    return (
        <div className="space-y-4">
            <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg">
                <TabButton label="Marketplace" icon={<BriefcaseIcon className="h-5 w-5"/>} isActive={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} />
                <TabButton label="Find Collaborators" icon={<UsersIcon className="h-5 w-5"/>} isActive={activeTab === 'collaborators'} onClick={() => setActiveTab('collaborators')} />
            </div>

            <div className="animate-fade-in">
                {activeTab === 'marketplace' ? (
                    <VentureMarketplacePage {...props} />
                ) : (
                    <VentureCollaboratorsPage {...props} />
                )}
            </div>
        </div>
    );
};
