import React, { useState, useEffect } from 'react';
import { UbtTransaction, GlobalEconomy } from '../types';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';

export const LedgerPage: React.FC = () => {
  const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubEconomy = api.listenForGlobalEconomy(setEconomy);
    const unsubLedger = api.listenForPublicLedger((txs) => {
      setTransactions(txs);
      setIsLoading(false);
    });

    return () => {
      unsubEconomy();
      unsubLedger();
    };
  }, []);

  const filteredTransactions = transactions.filter(tx => 
    tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.senderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.receiverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-gold/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 animate-fade-in">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-gold/10 rounded-3xl border-2 border-brand-gold/30 flex items-center justify-center shadow-glow-gold">
              <DatabaseIcon className="h-10 w-10 text-brand-gold" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">Public Ledger</h1>
              <p className="text-sm font-bold text-brand-gold tracking-[0.4em] uppercase opacity-60 mt-2">Protocol State Explorer</p>
            </div>
          </div>

          {economy && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">UBT Price</p>
                <p className="text-xl font-black text-brand-gold leading-none">${economy.ubt_to_usd_rate.toFixed(4)}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">CVP Backing</p>
                <p className="text-xl font-black text-green-400 leading-none">${economy.cvp_usd_backing.toLocaleString()}</p>
              </div>
              <div className="hidden sm:block bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Supply</p>
                <p className="text-xl font-black text-white leading-none">{economy.total_ubt_supply.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="relative mb-10 group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <SearchIcon className="h-6 w-6 text-white/20 group-focus-within:text-brand-gold transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Transaction ID, Node, or Reason..."
            className="w-full bg-white/5 border-2 border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white text-lg focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold placeholder:text-white/10"
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden shadow-premium relative">
          <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
          
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Transaction ID</th>
                  <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Sender Node</th>
                  <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Receiver Node</th>
                  <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Amount ($UBT)</th>
                  <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold mx-auto opacity-40" />
                      <p className="mt-4 text-sm font-bold text-white/30 uppercase tracking-widest">Synchronizing Ledger...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-gold/40 group-hover:bg-brand-gold transition-colors"></div>
                          <p className="text-xs font-mono font-bold text-white/70 group-hover:text-white transition-colors">{tx.id.substring(0, 16)}...</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-wider">{tx.senderId}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-wider">{tx.receiverId}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <TrendingUpIcon className="h-4 w-4 text-brand-gold opacity-40 group-hover:opacity-100 transition-opacity" />
                          <p className="text-lg font-black text-brand-gold leading-none">{tx.amount.toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-bold text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <p className="text-sm font-bold text-white/30 uppercase tracking-widest">No matching records found in the ledger.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40">
          <div className="flex items-center gap-3">
            <GlobeIcon className="h-5 w-5 text-brand-gold" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Protocol Status: Mainnet Online</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Block Height: 2,771,089</p>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Nodes: 14,205</p>
          </div>
        </div>
      </div>
    </div>
  );
};
