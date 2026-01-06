
import React, { useState, useMemo } from 'react';
import { Admin, User } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { SearchIcon } from './icons/SearchIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { LockIcon } from './icons/LockIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { Pagination } from './Pagination';
import { useAuth } from '../contexts/AuthContext';

export const AdminUserManagement: React.FC<{ admin: Admin; users: User[] }> = ({ admin, users }) => {
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [busyId, setBusyId] = useState<string | null>(null);
    const { addToast } = useToast();
    const { isSovereignLocked } = useAuth();
    const ITEMS_PER_PAGE = 10;

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            // Protocol Protection: Ignore malformed or null objects
            if (!u || !u.name) return false;
            
            const searchLower = search.toLowerCase();
            const nameMatch = u.name?.toLowerCase().includes(searchLower);
            const emailMatch = u.email?.toLowerCase().includes(searchLower);
            const idMatch = u.id?.includes(search);
            
            return nameMatch || emailMatch || idMatch;
        }).sort((a, b) => {
            // Sort Protection: Handle pending server timestamps
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
    }, [users, search]);

    const paginated = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const handleToggleStatus = async (user: User) => {
        if (isSovereignLocked) {
            addToast("AUTHORIZATION_REQUIRED: Please unlock your node session in the HUD first.", "error");
            return;
        }

        const isSuspended = user.status === 'suspended';
        const nextStatus = isSuspended ? 'active' : 'suspended';
        
        if (!window.confirm(`PROTOCOL_OVERRIDE: ${isSuspended ? 'Unlock/Activate' : 'Lock/Suspend'} node ${user.name}?`)) return;

        setBusyId(user.id);
        try {
            await api.setUserStatus(user.id, nextStatus);
            addToast(`Node ${user.name} state updated to ${nextStatus.toUpperCase()}.`, "success");
        } catch (e) {
            addToast("Authorization failure. Ledger update denied.", "error");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3rem] border-white/5 shadow-premium animate-fade-in space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Node Registry</h2>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Identity Authorization Panel</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-600 group-focus-within:text-brand-gold transition-colors">
                        <SearchIcon className="h-5 w-5" />
                    </div>
                    <input 
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="SEARCH IDENTITY..."
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-black text-white tracking-widest focus:ring-1 focus:ring-brand-gold/30 outline-none uppercase placeholder-gray-800"
                    />
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar relative">
                {isSovereignLocked && (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl animate-fade-in">
                        <LockIcon className="h-12 w-12 text-brand-gold mb-4" />
                        <p className="label-caps !text-[11px] !text-white text-center">Protocol Registry Locked</p>
                        <p className="text-[9px] text-gray-400 mt-2 uppercase font-black tracking-widest">Unlock your HUD session to modify nodes</p>
                    </div>
                )}
                
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] border-b border-white/5">
                            <th className="px-6 py-5">Node Identity</th>
                            <th className="px-6 py-5">Operational Circle</th>
                            <th className="px-6 py-5">State Pulse</th>
                            <th className="px-6 py-5 text-right">Handshake Override</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginated.map(u => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-700 group-hover:text-brand-gold transition-colors shadow-inner">
                                            <ShieldCheckIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[200px]">{u.name || 'Unknown Identity'}</p>
                                            <p className="text-[9px] text-gray-600 font-mono mt-1 uppercase truncate max-w-[150px]">{u.email || 'No Comms Address'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <span className="px-3 py-1 bg-black rounded-lg border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">{u.circle || 'GLOBAL'}</span>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-glow-matrix ${u.status === 'suspended' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'suspended' ? 'text-red-500' : 'text-emerald-500'}`}>{u.status === 'suspended' ? 'ISOLATED' : 'SYNCHRONIZED'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(u); }}
                                        disabled={busyId === u.id || u.id === admin.id}
                                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg border relative z-10 cursor-pointer
                                            ${u.id === admin.id ? 'opacity-20 cursor-not-allowed' : ''}
                                            ${u.status === 'suspended' 
                                                ? 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' 
                                                : 'bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white'}
                                        `}
                                    >
                                        {busyId === u.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : u.status === 'suspended' ? <><UnlockIcon className="h-3.5 w-3.5"/> Unlock Identity</> : <><LockIcon className="h-3.5 w-3.5"/> Lock Node</>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="py-32 text-center opacity-30">
                        <AlertTriangleIcon className="h-16 w-16 mx-auto mb-6 text-gray-700" />
                        <p className="label-caps !text-[12px] !tracking-[0.6em]">No Matching Entities Indexed</p>
                    </div>
                )}
            </div>

            <div className="pt-8 border-t border-white/5">
                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredUsers.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </div>
        </div>
    );
};
