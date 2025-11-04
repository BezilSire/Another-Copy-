import React, { useState, useMemo } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface MultiSelectPillsProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  minSelection?: number;
  maxSelection?: number;
  required?: boolean;
}

export const MultiSelectPills: React.FC<MultiSelectPillsProps> = ({
  label,
  options,
  selected,
  onChange,
  minSelection,
  maxSelection,
  required
}) => {
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [search, options]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      if (maxSelection && selected.length >= maxSelection) return;
      onChange([...selected, option]);
    }
  };
  
  const meetsMinRequirement = !minSelection || selected.length >= minSelection;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
        {minSelection && (
            <span className={`ml-2 text-xs ${meetsMinRequirement ? 'text-green-400' : 'text-yellow-400'}`}>
                (Selected {selected.length}/{minSelection} minimum)
            </span>
        )}
      </label>

      {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 p-2 bg-slate-900/50 rounded-md border border-slate-700">
              {selected.map(item => (
                   <div key={item} className="flex items-center gap-2 bg-green-600/20 text-green-300 px-2 py-1 rounded-full text-sm font-medium">
                        <span>{item}</span>
                        <button onClick={() => toggleOption(item)} className="text-green-300 hover:text-white"><XCircleIcon className="h-4 w-4" /></button>
                    </div>
              ))}
          </div>
      )}
      
      <div className="relative mt-2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
            type="text"
            placeholder="Search options..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white"
        />
      </div>
      
      <div className="mt-2 h-48 overflow-y-auto flex flex-wrap gap-2 p-2 border border-slate-700 rounded-md">
        {filteredOptions.map(option => {
            const isSelected = selected.includes(option);
            return (
                <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected 
                            ? 'bg-green-600 text-white' 
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                >
                    {option}
                </button>
            )
        })}
        {filteredOptions.length === 0 && <p className="text-sm text-gray-500 w-full text-center p-4">No matching options.</p>}
      </div>
    </div>
  );
};