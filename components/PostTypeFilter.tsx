import React from 'react';
import { Post } from '../types';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

type FilterType = Post['types'] | 'all';

interface PostTypeFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const filters: { label: string; value: FilterType; icon: React.ReactNode; }[] = [
    { label: 'All', value: 'all', icon: <LayoutDashboardIcon className="h-5 w-5" /> },
    { label: 'General', value: 'general', icon: <MessageSquareIcon className="h-5 w-5" /> },
    { label: 'Proposals', value: 'proposal', icon: <LightbulbIcon className="h-5 w-5" /> },
    { label: 'Offers', value: 'offer', icon: <UsersIcon className="h-5 w-5" /> },
    { label: 'Opportunities', value: 'opportunity', icon: <BriefcaseIcon className="h-5 w-5" /> },
];

export const PostTypeFilter: React.FC<PostTypeFilterProps> = ({ currentFilter, onFilterChange }) => {
    return (
        <div className="mb-4 bg-slate-800 p-2 rounded-lg">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {filters.map(filter => (
                    <button
                        key={filter.value}
                        onClick={() => onFilterChange(filter.value)}
                        className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                            currentFilter === filter.value
                                ? 'bg-green-600 text-white'
                                : 'text-gray-300 hover:bg-slate-700'
                        }`}
                    >
                        {filter.icon}
                        <span>{filter.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};