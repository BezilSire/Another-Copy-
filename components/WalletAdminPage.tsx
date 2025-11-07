import React, { useState, useEffect, useMemo } from 'react';
import { User, Admin, GlobalEconomy } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { SearchIcon } from './icons/SearchIcon';
import { Pagination } from './Pagination';
import { UpdateBalanceModal } from './UpdateBalanceModal';

interface WalletAdminPageProps {
  adminUser: Admin;
  allUsers: User[];
}

export const WalletAdminPage: React.FC<WalletAdminPageProps> = ({ adminUser, allUsers }) => {
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [priceInput, setPriceInput] = useState('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const [userToUpdate, setUserToUpdate] = useState<User | null>(null);
    const [redemptionTimeLeft, setRedemptionTimeLeft] = useState('');

    const { addToast } = useToast();

    useEffect(() => {
        const unsub = api.listenForGlobalEconomy(setEconomy, console.error);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (economy) {
            setPriceInput(String(economy.ubt_to_usd_rate || 0));
        }

        let timer: number | undefined;
        const calculateTime = () => {
             if (economy?.ubtRedemptionWindowOpen && economy?.ubtRedemptionWindowClosesAt) {
                const timeLeftMs = economy.ubtRedemptionWindowClosesAt.toDate().getTime() - new Date().getTime();
                if (timeLeftMs <= 0) {
                    setRedemptionTimeLeft('Closed');
                    clearInterval(timer);
                } else {
                    const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                    setRedemptionTimeLeft(`${days}d ${hours}h ${minutes}m`);
                }
            } else if (economy?.ubtRedemptionWindowStartedAt) {
                const nextWindowDate = new Date(economy.ubtRedemptionWindowStartedAt.toDate());
                nextWindowDate.setDate(nextWindowDate.getDate() + 60);
                const timeLeftMs = nextWindowDate.getTime() - new Date().getTime();
                if (timeLeftMs > 0) {
                    const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
                    setRedemptionTimeLeft(`~${days} day(s)`);
                } else {
                    setRedemptionTimeLeft('Ready to Open');
                }
            } else {
                setRedemptionTimeLeft('N/A');
            }
        };
        
        calculateTime(); // initial call
        timer = setInterval(calculateTime, 1000); // update every second

        return () => clearInterval(timer);

    }, [economy]);

    const handleSavePrice = async (e: React.FormEvent) => {
        e.preventDefault();
        const newPrice = parseFloat(priceInput);
        if (isNaN(newPrice) || newPrice < 0) {
            addToast("Invalid price. Must be a non-negative number.", "error");
            return;
        }
        setIsSavingPrice(true);
        try {
            await api.setGlobalEconomy(adminUser, { ubt_to_usd_rate: newPrice });
            addToast("UBT price updated successfully.", "success");
        } catch (error) {
            addToast("Failed to update price.", "error");
        } finally {
            setIsSavingPrice(false);
        }
    };
    
    const handleToggleRedemption = async () => {
        const open = !economy?.ubtRedemptionWindowOpen;
        const action = open ? 'open' : 'close';
        if (!window.confirm(`Are you sure you want to ${action} the UBT redemption window? This will affect all members.`)) return;
        
        setIsSavingPrice(true);
        try {
            await api.updateUbtRedemptionWindow(adminUser, open);
            addToast(`UBT redemption window is now ${open ? 'OPEN' : 'CLOSED'}.`, 'success');
        } catch(e) {
            addToast("Failed to update redemption window.", "error");
        } finally {
            setIsSavingPrice(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a,b) => (a.name > b.name) ? 1 : -1);
    }, [allUsers, searchQuery]);
    
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const handleModalClose = () => {
        setUserToUpdate(null);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-white mb-4">UBT Price Management</h2>
                        <form onSubmit={handleSavePrice} className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="w-full sm:w-auto">
                                <label htmlFor="priceInput" className="block text-sm font-medium text-gray-300">1 $UBT = USD</label>
                                <div className="relative mt-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-400 sm:text-sm">$</span></div>
                                    <input type="number" step="0.0001" id="priceInput" value={priceInput} onChange={e => setPriceInput(e.target.value)} className="block w-full rounded-md border-slate-600 bg-slate-700 pl-7 pr-4 py-2 text-white"/>
                                </div>
                            </div>
                            <button type="submit" disabled={isSavingPrice} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                                {isSavingPrice ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Save Price'}
                            </button>
                        </form>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-white mb-4">UBT Redemption Cycle</h2>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Current Status</p>
                                {economy?.ubtRedemptionWindowOpen ? (
                                    <p className="text-lg font-semibold text-green-400">Window is OPEN</p>
                                ) : (
                                    <p className="text-lg font-semibold text-yellow-400">Window is CLOSED</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {economy?.ubtRedemptionWindowOpen ? `Closes in: ${redemptionTimeLeft}` : `Next window in: ${redemptionTimeLeft}`}
                                </p>
                            </div>
                            <button onClick={handleToggleRedemption} disabled={isSavingPrice} className={`w-full sm:w-auto px-4 py-2 rounded-md font-semibold disabled:bg-slate-600 ${economy?.ubtRedemptionWindowOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                {isSavingPrice ? <LoaderIcon className="h-5 w-5 animate-spin"/> : economy?.ubtRedemptionWindowOpen ? 'Close Window Now' : 'Open 5-Day Window'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                     <h2 className="text-xl font-semibold text-white mb-4">User Wallets</h2>
                     <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search for a user by name or email..." className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white"/>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead>
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">User</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Balance ($UBT)</th>
                                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-0 text-left text-sm font-semibold text-gray-300">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {paginatedUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="py-4 pl-4 pr-3 text-sm sm:pl-0">
                                            <div className="font-medium text-white">{user.name}</div>
                                            <div className="text-gray-400">{user.email}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 font-mono">{(user.ubtBalance || 0).toFixed(2)}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-0">
                                            <button onClick={() => setUserToUpdate(user)} className="text-green-400 hover:text-green-300 font-semibold">Update</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length > ITEMS_PER_PAGE && (
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredUsers.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}
                    {filteredUsers.length === 0 && <p className="text-center py-8 text-gray-500">No users found.</p>}
                </div>
            </div>
            {userToUpdate && (
                <UpdateBalanceModal 
                    isOpen={!!userToUpdate}
                    onClose={handleModalClose}
                    userToUpdate={userToUpdate}
                    adminUser={adminUser}
                />
            )}
        </>
    );
};