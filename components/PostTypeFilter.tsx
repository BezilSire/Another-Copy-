
import React, { useMemo } from 'react';
import { FilterType } from '../types';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { SirenIcon } from './icons/SirenIcon';
import { SparkleIcon } from './icons/SparkleIcon';

interface PostTypeFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isAdminView?: boolean;
}

export const PostTypeFilter: React.FC<PostTypeFilterProps> = ({ currentFilter, onFilterChange, isAdminView = false }) => {
    const filters = useMemo(() => {
        const allFilters: { label: string; value: FilterType; icon: React.ReactNode; }[] = [
            { label: 'Intelligence', value: 'foryou', icon: <SparkleIcon className="h-5 w-5" /> },
            { label: 'Network', value: 'all', icon: <LayoutDashboardIcon className="h-5 w-5" /> },
            { label: 'Proposals', value: 'proposal', icon: <LightbulbIcon className="h-5 w-5" /> },
            { label: 'Offers', value: 'offer', icon: <UsersIcon className="h-5 w-5" /> },
            { label: 'Work', value: 'opportunity', icon: <BriefcaseIcon className="h-5 w-5" /> },
        ];
        if (isAdminView) {
            allFilters.push({ label: 'Distress', value: 'distress', icon: <SirenIcon className="h-5 w-5 text-red-400" /> });
        }
        return allFilters;
    }, [isAdminView]);

    return (
        <div className="mb-10 p-2 bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 w-fit mx-auto sm:mx-0 shadow-2xl flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
            {filters.map(filter => (
                <button
                    key={filter.value}
                    onClick={() => onFilterChange(filter.value)}
                    className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-500 group ${
                        currentFilter === filter.value
                            ? 'bg-brand-gold text-slate-950 shadow-glow-gold'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                    <div className={`transition-transform duration-300 group-hover:scale-110 ${currentFilter === filter.value ? 'scale-110' : ''}`}>
                        {filter.icon}
                    </div>
                    <span className="whitespace-nowrap">{filter.label}</span>
                </button>
            ))}
        </div>
    );
};
