import React, { useState, useMemo, useEffect } from 'react';
import { Member, User } from '../types';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { UserIcon } from './icons/UserIcon';
import { Pagination } from './Pagination';
import { Timestamp } from 'firebase/firestore';

interface MemberListProps {
  members: Member[];
  isAdminView?: boolean;
  onMarkAsComplete?: (member: Member) => void;
  onSelectMember?: (member: Member) => void;
  onResetQuota?: (member: Member) => void;
  onClearDistressPost?: (member: Member) => void;
  onViewProfile?: (userId: string) => void;
  onStartChat?: (user: Member & User) => void;
}

const PaymentStatusBadge: React.FC<{ status: Member['payment_status'] }> = ({ status }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider capitalize';
  if (status === 'complete') {
    return <span className={`${baseClasses} bg-green-900/30 text-green-400 border border-green-800`}>Complete</span>;
  }
  if (status === 'installment') {
    return <span className={`${baseClasses} bg-blue-900/30 text-blue-400 border border-blue-800`}>Installment</span>;
  }
  if (status === 'pending_verification') {
    return <span className={`${baseClasses} bg-purple-900/30 text-purple-400 border border-purple-800`}>Pending</span>;
  }
  if (status === 'rejected') {
    return <span className={`${baseClasses} bg-red-900/30 text-red-400 border border-red-800`}>Rejected</span>;
  }
  return <span className={`${baseClasses} bg-yellow-900/30 text-yellow-400 border border-yellow-800`}>Pending</span>;
};

const UserStatusBadge: React.FC<{ status: User['status'] | undefined }> = ({ status }) => {
    if (!status) return <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Offline Node</span>;
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider capitalize';
    switch (status) {
        case 'active': return <span className={`${baseClasses} bg-green-900/30 text-green-400 border border-green-800`}>Verified</span>;
        case 'pending': return <span className={`${baseClasses} bg-yellow-900/30 text-yellow-400 border border-yellow-800`}>Awaiting</span>;
        case 'suspended': return <span className={`${baseClasses} bg-orange-900/30 text-orange-400 border border-orange-800`}>Suspended</span>;
        case 'ousted': return <span className={`${baseClasses} bg-red-900/30 text-red-400 border border-red-800`}>Ousted</span>;
        default: return null;
    }
};

type SortableKeys = 'full_name' | 'registration_amount' | 'payment_status' | 'date_registered' | 'agent_name';

const SortableHeader: React.FC<{
  sortKey: SortableKeys;
  sortConfig: { key: SortableKeys; direction: 'ascending' | 'descending' };
  requestSort: (key: SortableKeys) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ sortKey, sortConfig, requestSort, children, className }) => {
  const isActive = sortConfig.key === sortKey;
  const isAscending = sortConfig.direction === 'ascending';

  return (
    <th scope="col" className={`py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ${className}`}>
      <button
        onClick={() => requestSort(sortKey)}
        className="flex items-center group focus:outline-none"
      >
        <span>{children}</span>
        <span className={`ml-2 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
          {isActive ? (
            isAscending ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4 text-slate-700" />
          )}
        </span>
      </button>
    </th>
  );
};

export const MemberList: React.FC<MemberListProps> = ({ members, isAdminView = false, onMarkAsComplete, onSelectMember, onResetQuota, onClearDistressPost, onViewProfile, onStartChat }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({
    key: 'date_registered',
    direction: 'descending',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [members]);

  const sortedMembers = useMemo(() => {
    let sortableItems = [...members];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        let comparison = 0;
        if (sortConfig.key === 'registration_amount') {
          comparison = (aValue as number) - (bValue as number);
        } else if (sortConfig.key === 'date_registered') {
          const aMillis = (aValue as Timestamp)?.toDate ? (aValue as Timestamp).toMillis() : new Date(aValue as string).getTime();
          const bMillis = (bValue as Timestamp)?.toDate ? (bValue as Timestamp).toMillis() : new Date(bValue as string).getTime();
          comparison = aMillis - bMillis;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [members, sortConfig]);
  
  const totalPages = Math.ceil(sortedMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = sortedMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (members.length === 0) return null;

  return (
    <div className="animate-fade-in">
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5">
          <thead>
            <tr>
              <SortableHeader sortKey="full_name" sortConfig={sortConfig} requestSort={requestSort}>Full Name</SortableHeader>
              <th className="py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Contact Node</th>
              <SortableHeader sortKey="payment_status" sortConfig={sortConfig} requestSort={requestSort}>Verification</SortableHeader>
              {isAdminView && <th className="py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Node Status</th>}
              <SortableHeader sortKey="date_registered" sortConfig={sortConfig} requestSort={requestSort}>Joined</SortableHeader>
              <th className="py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Protocol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedMembers.map((member) => (
              <tr 
                key={member.id}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                onClick={() => onSelectMember && !isAdminView && onSelectMember(member)}
              >
                <td className="whitespace-nowrap py-5 text-sm font-black text-white group-hover:text-brand-gold transition-colors">
                  <div className="flex items-center">
                    {isAdminView && member.is_duplicate_email && <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />}
                    <button onClick={(e) => { e.stopPropagation(); onViewProfile && member.uid && onViewProfile(member.uid); }}>
                        {member.full_name}
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap py-5 text-xs text-gray-400 font-mono">
                  {member.email}
                </td>
                 <td className="whitespace-nowrap py-5"><PaymentStatusBadge status={member.payment_status} /></td>
                 {isAdminView && <td className="whitespace-nowrap py-5"><UserStatusBadge status={member.status} /></td>}
                 <td className="whitespace-nowrap py-5 text-xs text-gray-500 font-mono">
                  {(member.date_registered as Timestamp)?.toDate ? (member.date_registered as Timestamp).toDate().toLocaleDateString() : 'N/A'}
                 </td>
                <td className="whitespace-nowrap py-5">
                   <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdminView && onViewProfile && member.uid && (
                          <button onClick={(e) => { e.stopPropagation(); onViewProfile(member.uid!); }} className="p-2 bg-slate-900 rounded-lg text-gray-500 hover:text-white" title="Profile"><UserIcon className="h-4 w-4" /></button>
                      )}
                      {isAdminView && onStartChat && member.uid && (
                          <button onClick={(e) => { e.stopPropagation(); onStartChat({ ...member, id: member.uid!, name: member.full_name, role: 'member' } as any); }} className="p-2 bg-slate-900 rounded-lg text-green-500 hover:text-green-400" title="Message"><MessageSquareIcon className="h-4 w-4" /></button>
                      )}
                      {isAdminView && member.payment_status === 'pending_verification' && onSelectMember && (
                         <button onClick={(e) => { e.stopPropagation(); onSelectMember(member); }} className="p-2 bg-yellow-900/20 rounded-lg text-yellow-500 hover:text-yellow-400" title="Verify"><ShieldCheckIcon className="h-4 w-4" /></button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedMembers.map((member) => (
          <div 
            key={member.id} 
            className="glass-card p-5 rounded-3xl border border-white/5 space-y-4"
            onClick={() => onSelectMember && !isAdminView && onSelectMember(member)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-black text-white group-hover:text-brand-gold transition-colors">{member.full_name}</h4>
                <p className="text-[10px] text-gray-500 font-mono mt-1">{member.email}</p>
              </div>
              <PaymentStatusBadge status={member.payment_status} />
            </div>
            
            <div className="flex justify-between items-end border-t border-white/5 pt-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Node Verified</p>
                <p className="text-xs text-gray-400">{(member.date_registered as Timestamp)?.toDate ? (member.date_registered as Timestamp).toDate().toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div className="flex gap-2">
                  {isAdminView && onViewProfile && member.uid && (
                      <button onClick={(e) => { e.stopPropagation(); onViewProfile(member.uid!); }} className="p-2.5 bg-slate-900 rounded-xl text-gray-500"><UserIcon className="h-4 w-4" /></button>
                  )}
                  {isAdminView && onStartChat && member.uid && (
                      <button onClick={(e) => { e.stopPropagation(); onStartChat({ ...member, id: member.uid!, name: member.full_name, role: 'member' } as any); }} className="p-2.5 bg-slate-900 rounded-xl text-green-500"><MessageSquareIcon className="h-4 w-4" /></button>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 px-2">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={sortedMembers.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>
    </div>
  );
};