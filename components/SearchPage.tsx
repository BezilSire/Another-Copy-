import React from 'react';
import { SearchIcon } from './icons/SearchIcon';

export const SearchPage: React.FC = () => {
    return (
        <div className="p-4 animate-fade-in text-center text-gray-500">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 text-slate-700" />
            <h1 className="text-2xl font-bold text-white">Search</h1>
            <p className="mt-2">Discover posts, members, and more.</p>
            <div className="mt-6 relative max-w-sm mx-auto">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search Ubuntium..."
                    className="block w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>
        </div>
    );
};
