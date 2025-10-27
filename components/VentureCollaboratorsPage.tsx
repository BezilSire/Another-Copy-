import React, { useState, useEffect, useMemo } from 'react';
import { User, MemberUser, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useDebounce } from '../hooks/useDebounce';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { FilePenIcon } from './icons/FilePenIcon';
import { UserCard } from './UserCard';

const SKILLS_LIST = ['Software Development', 'Marketing', 'Sales', 'Product Management', 'Design (UI/UX)', 'Finance', 'Legal', 'Operations', 'Human Resources', 'Agriculture', 'Education', 'Healthcare'];

interface VentureCollaboratorsPageProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onNavigateToPitchAssistant: () => void;
}

export const VentureCollaboratorsPage: React.FC<VentureCollaboratorsPageProps> = ({ currentUser, onViewProfile, onNavigateToPitchAssistant }) => {
  const [members, setMembers] = useState<PublicUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { addToast } = useToast();
  
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
        const matchesSearch = debouncedSearch ? member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || member.businessIdea?.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
        const matchesSkill = skillFilter ? member.skills?.toLowerCase().includes(skillFilter.toLowerCase()) : true;
        return matchesSearch && matchesSkill;
    });
  }, [members, debouncedSearch, skillFilter]);


  useEffect(() => {
    setIsLoading(true);
    api.getVentureMembers(500) // Fetch up to 500 members for client-side filtering
      .then(({ users }) => {
          setMembers(users.filter(u => u.id !== currentUser.id));
      })
      .catch(() => addToast("Could not load community ventures.", "error"))
      .finally(() => setIsLoading(false));
  }, [currentUser.id, addToast]);

  return (
    <div className="space-y-6">
       <div className="bg-slate-800 p-6 rounded-lg text-center border border-green-800/50">
            <FilePenIcon className="h-12 w-12 mx-auto text-green-400" />
            <h2 className="text-xl font-bold text-white mt-2">Have a business idea?</h2>
            <p className="text-gray-300 mt-1 max-w-xl mx-auto">Use our AI assistant to structure your thoughts and generate a professional pitch deck to share with the community.</p>
            <button onClick={onNavigateToPitchAssistant} className="mt-4 inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                Generate a Pitch with AI
            </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name or idea..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>
            <select onChange={e => setSkillFilter(e.target.value)} value={skillFilter} className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Filter by skill...</option>
                {SKILLS_LIST.map(skill => <option key={skill} value={skill}>{skill}</option>)}
            </select>
       </div>

      {isLoading ? (
          <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
      ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMembers.map((user) => (
                  <UserCard key={user.id} user={user} currentUser={currentUser} onClick={() => onViewProfile(user.id)} />
              ))}
          </div>
      ) : (
          <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
            <p className="font-semibold text-lg text-white">No members found</p>
            <p>Try adjusting your search filters, or check back later as more members join the Ventures Hub.</p>
          </div>
      )}
    </div>
  );
};
