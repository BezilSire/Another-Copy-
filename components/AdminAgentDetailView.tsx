import React from 'react';
import { Agent, Member } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { MemberList } from './MemberList';
import { Pagination } from './Pagination'; // Re-use pagination for consistency
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../utils';
import { useToast } from '../contexts/ToastContext';

interface AdminAgentDetailViewProps {
  agent: Agent;
  members: Member[];
  onBack: () => void;
}

const DetailItem: React.FC<{label: string, value: string, isMono?: boolean}> = ({label, value, isMono = false}) => (
    <div className="py-2">
        <dt className="text-gray-400 font-medium">{label}</dt>
        <dd className={`mt-1 text-white ${isMono ? 'font-mono' : ''}`}>{value || <span className="text-gray-500 italic">Not provided</span>}</dd>
    </div>
);


export const AdminAgentDetailView: React.FC<AdminAgentDetailViewProps> = ({ agent, members, onBack }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { addToast } = useToast();

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = () => {
    if (members.length === 0) {
        addToast('This agent has no members to export.', 'info');
        return;
    }
    // Omit fields not relevant to this specific export
    const dataToExport = members.map(({ welcome_message, agent_id, agent_name, ...rest }) => rest);
    exportToCsv(`${agent.name.replace(/\s+/g, '_')}-members-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
    addToast(`Member data for ${agent.name} is being downloaded.`, 'info');
  };


  return (
    <div className="animate-fade-in">
        <button onClick={onBack} className="inline-flex items-center mb-6 text-sm font-medium text-green-400 hover:text-green-300 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Agent List
        </button>

        <div className="bg-slate-900/50 p-6 rounded-lg shadow-lg">
            <div className="pb-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
                <p className="text-sm text-gray-400">{agent.email}</p>
            </div>
            
            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <DetailItem label="Agent Code" value={agent.agent_code} isMono />
                <DetailItem label="Circle" value={agent.circle} />
                <DetailItem label="Phone Number" value={agent.phone || ''} />
                <DetailItem label="ID Card Number" value={agent.id_card_number || ''} />
                <DetailItem label="Address" value={agent.address || ''} />
            </dl>
        </div>

        <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Members Registered by {agent.name} ({members.length})</h3>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="w-full sm:w-auto sm:max-w-md">
                    <label htmlFor="agent-detail-member-search" className="sr-only">Search Members</label>
                    <input
                        type="text"
                        id="agent-detail-member-search"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                 </div>
                 <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 text-sm w-full sm:w-auto"
                >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download CSV
                </button>
             </div>
            {filteredMembers.length > 0 ? (
                <MemberList members={filteredMembers} />
            ) : (
                <div className="text-center py-8 bg-slate-900/50 rounded-lg">
                    <p className="text-gray-400">
                        {searchQuery ? 'No members match your search.' : 'This agent has not registered any members yet.'}
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};