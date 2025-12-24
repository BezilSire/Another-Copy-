
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
            { label: 'Opportunities', value: 'opportunity', icon: <BriefcaseIcon className="h-5 w-5" /> },
        ];
        if (isAdminView) {
            allFilters.push({ label: 'Distress', value: 'distress', icon: <SirenIcon className="h-5 w-5 text-red-400" /> });
        }
        return allFilters;
    }, [isAdminView]);

    return (
        <div className="mb-8 p-1.5 bg-slate-950/80 rounded-[2rem] border border-white/5 w-fit mx-auto sm:mx-0 shadow-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
            {filters.map(filter => (
                <button
                    key={filter.value}
                    onClick={() => onFilterChange(filter.value)}
                    className={`flex-shrink-0 flex items-center gap-3 px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all duration-500 ${
                        currentFilter === filter.value
                            ? 'bg-brand-gold text-slate-950 shadow-glow-gold'
                            : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                    {filter.icon}
                    <span>{filter.label}</span>
                </button>
            ))}
        </div>
    );
};
