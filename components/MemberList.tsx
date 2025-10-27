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
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
  if (status === 'complete') {
    return <span className={`${baseClasses} bg-green-800 text-green-300`}>Complete</span>;
  }
  if (status === 'installment') {
    return <span className={`${baseClasses} bg-blue-800 text-blue-300`}>Installment</span>;
  }
  if (status === 'pending_verification') {
    return <span className={`${baseClasses} bg-purple-800 text-purple-300`}>Pending Verification</span>;
  }
  if (status === 'rejected') {
    return <span className={`${baseClasses} bg-red-800 text-red-300`}>Rejected</span>;
  }
  return <span className={`${baseClasses} bg-yellow-800 text-yellow-300`}>Pending</span>;
};

const UserStatusBadge: React.FC<{ status: User['status'] | undefined }> = ({ status }) => {
    if (!status) return <span className="text-xs text-slate-500">N/A</span>;
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
    switch (status) {
        case 'active': return <span className={`${baseClasses} bg-green-800 text-green-300`}>Active</span>;
        case 'pending': return <span className={`${baseClasses} bg-yellow-800 text-yellow-300`}>Pending</span>;
        case 'suspended': return <span className={`${baseClasses} bg-orange-800 text-orange-300`}>Suspended</span>;
        case 'ousted': return <span className={`${baseClasses} bg-red-800 text-red-300`}>Ousted</span>;
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
    <th scope="col" className={`py-3.5 text-left text-sm font-semibold text-gray-300 ${className}`}>
      <button
        onClick={() => requestSort(sortKey)}
        className="flex items-center group focus:outline-none"
        aria-label={`Sort by ${String(children)}`}
      >
        <span>{children}</span>
        <span className={`ml-1 transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
          {isActive ? (
            isAscending ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4 text-slate-500" />
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
          comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
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

  if (members.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-6 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <SortableHeader sortKey="full_name" sortConfig={sortConfig} requestSort={requestSort} className="pl-4 pr-3 sm:pl-0">Name</SortableHeader>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Contact</th>
                  <SortableHeader sortKey="payment_status" sortConfig={sortConfig} requestSort={requestSort} className="px-3">Payment Status</SortableHeader>
                  {isAdminView && <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">User Status</th>}
                  {isAdminView && <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Distress Calls</th>}
                  <SortableHeader sortKey="date_registered" sortConfig={sortConfig} requestSort={requestSort} className="px-3">Registered</SortableHeader>
                  {isAdminView && <SortableHeader sortKey="agent_name" sortConfig={sortConfig} requestSort={requestSort} className="px-3">Registered By</SortableHeader>}
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedMembers.map((member) => (
                  <tr 
                    key={member.id}
                    className={onSelectMember && !isAdminView ? 'hover:bg-slate-700 cursor-pointer transition-colors duration-150' : ''}
                    onClick={() => onSelectMember && !isAdminView && onSelectMember(member)}
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                      <div className="flex items-center">
                        {isAdminView && member.is_duplicate_email && (
                          <ExclamationTriangleIcon 
                            className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" 
                            title="Warning: An account with this email already exists." 
                          />
                        )}
                         <button 
                          onClick={(e) => { e.stopPropagation(); onViewProfile && member.uid && onViewProfile(member.uid); }} 
                          className="hover:underline disabled:no-underline disabled:cursor-default" 
                          disabled={!onViewProfile || !member.uid}
                         >
                           {member.full_name}
                         </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                      <div>{member.email}</div>
                      <div>{member.phone}</div>
                    </td>
                     <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400"><PaymentStatusBadge status={member.payment_status} /></td>
                     {isAdminView && <td className="whitespace-nowrap px-3 py-4 text-sm"><UserStatusBadge status={member.status} /></td>}
                     {isAdminView && <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-mono text-gray-300">{typeof member.distress_calls_available === 'number' ? member.distress_calls_available : 'N/A'}</td>}
                     <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{new Date(member.date_registered).toLocaleDateString()}</td>
                     {isAdminView && <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{member.agent_name}</td>}
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-0">
                       <div className="flex items-center space-x-4">
                          {isAdminView && onViewProfile && member.uid && (
                              <button onClick={(e) => { e.stopPropagation(); onViewProfile(member.uid!); }} className="text-gray-400 hover:text-white" title="View Profile">
                                  <UserIcon className="h-4 w-4" />
                              </button>
                          )}
                          {isAdminView && onStartChat && member.uid && (
                              <button onClick={(e) => { e.stopPropagation(); onStartChat({ ...member, id: member.uid!, name: member.full_name, role: 'member' }); }} className="text-green-400 hover:text-green-300" title="Message Member">
                                  <MessageSquareIcon className="h-4 w-4" />
                              </button>
                          )}
                          {isAdminView && member.payment_status === 'pending_verification' && onSelectMember && (
                             <button onClick={(e) => { e.stopPropagation(); onSelectMember(member); }} className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300" title="Verify Member">
                              <ShieldCheckIcon className="h-4 w-4" /> <span>Verify</span>
                             </button>
                          )}
                          {isAdminView && member.payment_status !== 'complete' && onMarkAsComplete && member.payment_status !== 'pending_verification' && (
                            <button onClick={(e) => { e.stopPropagation(); onMarkAsComplete(member); }} className="text-green-400 hover:text-green-300" title="Mark payment as complete">Mark Complete</button>
                          )}
                          {isAdminView && onResetQuota && member.uid && (
                              <button onClick={(e) => { e.stopPropagation(); onResetQuota(member); }} className="text-blue-400 hover:text-blue-300" title="Reset distress call quota"><RotateCwIcon className="h-4 w-4" /></button>
                          )}
                          {isAdminView && onClearDistressPost && member.uid && (
                              <button onClick={(e) => { e.stopPropagation(); onClearDistressPost(member); }} className="text-red-400 hover:text-red-300" title="Clear last distress post"><TrashIcon className="h-4 w-4" /></button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={sortedMembers.length}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </>
  );
};