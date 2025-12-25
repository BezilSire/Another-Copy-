import React from 'react';
import { FilterType } from '../types';

interface PostTypeFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const PostTypeFilter: React.FC<PostTypeFilterProps> = ({ currentFilter, onFilterChange }) => {
    const filters: {label: string, value: FilterType}[] = [
        { label: 'All', value: 'all' },
        { label: 'Intelligence', value: 'foryou' },
        { label: 'Proposals', value: 'proposal' },
        { label: 'Opportunities', value: 'opportunity' },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-2">
            {filters.map(f => (
                <button
                    key={f.value}
                    onClick={() => onFilterChange(f.value)}
                    className={`flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                        currentFilter === f.value 
                        ? 'bg-gold text-obsidian border-gold shadow-glow-gold' 
                        : 'bg-obsidian border-white/10 text-gray-500 hover:text-white'
                    }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
};