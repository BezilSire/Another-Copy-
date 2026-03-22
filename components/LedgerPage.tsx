import { useState, useEffect } from 'react';
import { UbtTransaction, GlobalEconomy, Block, User } from '../types';
import { api } from '../services/apiService';
import { auth } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ActivityIcon } from './icons/ActivityIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { safeJsonStringify } from '../utils';

export const LedgerPage = () => {
  const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [mempool, setMempool] = useState<UbtTransaction[]>([]);
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'blocks' | 'mempool' | 'network'>('transactions');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [miningStatus, setMiningStatus] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        const userData = await api.getUser(user.uid);
        setCurrentUser(userData);
      }
    });

    const unsubEconomy = api.listenForGlobalEconomy(setEconomy);
    const unsubLedger = api.listenForPublicLedger((txs) => {
      setTransactions(txs);
      setIsLoading(false);
    });
    const unsubBlocks = api.listenForBlocks(setBlocks);
    const unsubMempool = api.listenForMempool(setMempool);

    return () => {
      unsubAuth();
      unsubEconomy();
      unsubLedger();
      unsubBlocks();
      unsubMempool();
    };
  }, []);

  const handleMine = async () => {
    if (!currentUser) return;
    setIsMining(true);
    setMiningStatus('Initializing Miner...');
    try {
      await api.minePendingTransactions(currentUser.id, (nonce) => {
        if (nonce % 1000 === 0) setMiningStatus(`Mining... Nonce: ${nonce}`);
      });
      setMiningStatus('Block Mined Successfully!');
      setTimeout(() => {
        setIsMining(false);
        setMiningStatus('');
      }, 3000);
    } catch (error) {
      console.error('Mining failed:', error);
      setMiningStatus('Mining Failed.');
      setTimeout(() => setIsMining(false), 3000);
    }
  };

  const handleValidateChain = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const isValid = await api.validateChain();
      setValidationResult({
        success: isValid,
        message: isValid ? 'Blockchain integrity verified. All blocks and transactions are valid.' : 'Blockchain integrity compromised! Invalid block detected.'
      });
    } catch (error) {
      setValidationResult({ success: false, message: 'Validation failed due to a protocol error.' });
    } finally {
      setIsValidating(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.senderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.receiverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTransactionTable = (txs: UbtTransaction[], showStatus = false) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-white/10 bg-white/5">
          <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Transaction ID</th>
          <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Sender</th>
          <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Receiver</th>
          <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Amount ($UBT)</th>
          {showStatus && <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Status</th>}
          <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Timestamp</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {txs.map((tx) => (
          <tr 
            key={tx.id} 
            onClick={() => setSelectedTx(tx)}
            className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
          >
            <td className="px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-gold/40 group-hover:bg-brand-gold transition-colors"></div>
                <p className="text-xs font-mono font-bold text-white/70 group-hover:text-white transition-colors">{tx.id.substring(0, 16)}...</p>
              </div>
            </td>
            <td className="px-8 py-6">
              <p className="text-xs font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-wider">{tx.senderId.substring(0, 12)}...</p>
            </td>
            <td className="px-8 py-6">
              <p className="text-xs font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-wider">{tx.receiverId.substring(0, 12)}...</p>
            </td>
            <td className="px-8 py-6">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-brand-gold opacity-40 group-hover:opacity-100 transition-opacity" />
                <p className="text-lg font-black text-brand-gold leading-none">{tx.amount.toLocaleString()}</p>
              </div>
            </td>
            {showStatus && (
              <td className="px-8 py-6">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tx.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${tx.status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {tx.status || 'Verified'}
                  </p>
                </div>
              </td>
            )}
            <td className="px-8 py-6">
              <p className="text-[10px] font-bold text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">
                {tx.timestamp instanceof Timestamp ? tx.timestamp.toDate().toLocaleString() : new Date(tx.timestamp as any).toLocaleString()}
              </p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (selectedBlock) {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-gold/30 p-12">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => setSelectedBlock(null)}
            className="flex items-center gap-3 text-brand-gold font-black uppercase tracking-widest text-[10px] mb-12 hover:gap-5 transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to Ledger
          </button>

          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-6xl font-black tracking-tighter uppercase leading-none mb-4">Block #{selectedBlock.index}</h1>
              <p className="text-brand-gold font-mono text-sm opacity-60 break-all">{selectedBlock.hash}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Mined At</p>
              <p className="text-xl font-bold">{new Date(selectedBlock.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Previous Hash', value: selectedBlock.previousHash.substring(0, 16) + '...', full: selectedBlock.previousHash },
              { label: 'Merkle Root', value: selectedBlock.merkleRoot.substring(0, 16) + '...', full: selectedBlock.merkleRoot },
              { label: 'Nonce', value: selectedBlock.nonce.toLocaleString() },
              { label: 'Difficulty', value: selectedBlock.difficulty },
              { label: 'Miner ID', value: selectedBlock.minerId },
              { label: 'Transactions', value: selectedBlock.transactions.length },
              { label: 'Size', value: `${(safeJsonStringify(selectedBlock).length / 1024).toFixed(2)} KB` },
              { label: 'Status', value: 'Confirmed', color: 'text-green-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-gold/20 group-hover:bg-brand-gold transition-all"></div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className={`text-xl font-black truncate ${stat.color || 'text-white'}`} title={stat.full}>{stat.value}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Transactions in Block</h2>
          <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden shadow-premium relative">
            <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
            {renderTransactionTable(selectedBlock.transactions)}
          </div>
        </div>
      </div>
    );
  }

  if (selectedTx) {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-gold/30 p-12">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => setSelectedTx(null)}
            className="flex items-center gap-3 text-brand-gold font-black uppercase tracking-widest text-[10px] mb-12 hover:gap-5 transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to Ledger
          </button>

          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <div className="w-24 h-24 bg-brand-gold/10 rounded-[2.5rem] border-2 border-brand-gold/30 flex items-center justify-center mx-auto mb-8 shadow-glow-gold">
                <TrendingUpIcon className="h-12 w-12 text-brand-gold" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-4">Transaction Details</h1>
              <p className="text-brand-gold font-mono text-xs opacity-60 break-all">{selectedTx.id}</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Status', value: selectedTx.status || 'Verified', color: selectedTx.status === 'pending' ? 'text-yellow-500' : 'text-green-500' },
                { label: 'Amount', value: `${selectedTx.amount.toLocaleString()} UBT`, highlight: true },
                { label: 'Fee', value: `${selectedTx.fee || 0} UBT` },
                { label: 'Sender', value: selectedTx.senderId },
                { label: 'Receiver', value: selectedTx.receiverId },
                { label: 'Timestamp', value: selectedTx.timestamp instanceof Timestamp ? selectedTx.timestamp.toDate().toLocaleString() : new Date(selectedTx.timestamp as any).toLocaleString() },
                { label: 'Nonce', value: selectedTx.nonce },
                { label: 'Type', value: selectedTx.type || 'TRANSFER' },
                { label: 'Reason', value: selectedTx.reason || 'N/A' },
                { label: 'Signature', value: selectedTx.signature.substring(0, 32) + '...', full: selectedTx.signature }
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-6 border-b border-white/5 group">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{row.label}</p>
                  <p className={`text-sm font-bold ${row.highlight ? 'text-2xl text-brand-gold' : row.color || 'text-white/80'} group-hover:text-white transition-colors break-all text-right max-w-[60%]`} title={row.full}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="flex gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'transactions', label: 'Transactions' },
            { id: 'blocks', label: 'Blocks' },
            { id: 'mempool', label: `Mempool (${mempool.length})` },
            { id: 'network', label: 'Network' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-gold text-black border-brand-gold shadow-glow-gold' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'network' && (
          <div className="relative mb-10 group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <SearchIcon className="h-6 w-6 text-white/20 group-focus-within:text-brand-gold transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, Node, or Reason..."
              className="w-full bg-white/5 border-2 border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white text-lg focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold placeholder:text-white/10"
            />
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden shadow-premium relative">
          <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
          
          <div className="overflow-x-auto no-scrollbar">
            {activeTab === 'transactions' && (
              <>
                {isLoading ? (
                  <div className="px-8 py-20 text-center">
                    <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold mx-auto opacity-40" />
                    <p className="mt-4 text-sm font-bold text-white/30 uppercase tracking-widest">Synchronizing Ledger...</p>
                  </div>
                ) : filteredTransactions.length > 0 ? (
                  renderTransactionTable(filteredTransactions)
                ) : (
                  <div className="px-8 py-20 text-center">
                    <p className="text-sm font-bold text-white/30 uppercase tracking-widest">No matching records found in the ledger.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'blocks' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Index</th>
                    <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Block Hash</th>
                    <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Transactions</th>
                    <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Miner</th>
                    <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Difficulty</th>
                    <th className="px-8 py-6 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blocks.length > 0 ? (
                    blocks.map((block) => (
                      <tr 
                        key={block.id} 
                        onClick={() => setSelectedBlock(block)}
                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <p className="text-lg font-black text-brand-gold tracking-tighter">#{block.index}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-mono font-bold text-white/70 group-hover:text-white transition-colors">{block.hash.substring(0, 24)}...</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-white/50">{block.transactions.length} TXs</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-bold text-white/50 uppercase tracking-wider">{block.minerId.substring(0, 12)}...</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-bold text-brand-gold uppercase tracking-widest">D:{block.difficulty}</p>
                        </td>
                        <td className="px-8 py-6">
                          <ChevronRightIcon className="h-5 w-5 text-white/20 group-hover:text-brand-gold transition-all" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <p className="text-sm font-bold text-white/30 uppercase tracking-widest">No blocks mined yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'mempool' && (
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter">Pending Transactions</h2>
                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Unconfirmed transactions waiting to be mined</p>
                  </div>
                  {mempool.length > 0 && (
                    <button
                      onClick={handleMine}
                      disabled={isMining}
                      className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border flex items-center gap-3 ${isMining ? 'bg-white/10 text-white/40 border-white/10' : 'bg-brand-gold text-black border-brand-gold shadow-glow-gold hover:scale-105 active:scale-95'}`}
                    >
                      {isMining ? (
                        <>
                          <LoaderIcon className="h-4 w-4 animate-spin" />
                          {miningStatus}
                        </>
                      ) : (
                        <>
                          <ActivityIcon className="h-4 w-4" />
                          Mine Next Block
                        </>
                      )}
                    </button>
                  )}
                </div>
                {mempool.length > 0 ? (
                  <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                    {renderTransactionTable(mempool, true)}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircleIcon className="h-8 w-8 text-green-500/40" />
                    </div>
                    <p className="text-sm font-bold text-white/30 uppercase tracking-widest">Mempool is empty. All transactions are confirmed.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'network' && (
              <div className="p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4">
                      <ShieldCheckIcon className="h-8 w-8 text-brand-gold" />
                      Protocol Integrity
                    </h2>
                    <div className="bg-black/20 rounded-[2.5rem] border border-white/5 p-8 mb-8">
                      <p className="text-sm font-bold text-white/60 leading-relaxed mb-8">
                        The UBT protocol uses a Proof-of-Work consensus mechanism. Every block is cryptographically linked to the previous one, ensuring an immutable chain of events.
                      </p>
                      <button
                        onClick={handleValidateChain}
                        disabled={isValidating}
                        className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border flex items-center justify-center gap-4 ${isValidating ? 'bg-white/10 text-white/40 border-white/10' : 'bg-white/5 text-white hover:bg-white/10 border-white/10'}`}
                      >
                        {isValidating ? (
                          <>
                            <LoaderIcon className="h-5 w-5 animate-spin" />
                            Validating Chain...
                          </>
                        ) : (
                          <>
                            <ShieldCheckIcon className="h-5 w-5" />
                            Verify Chain Integrity
                          </>
                        )}
                      </button>

                      {validationResult && (
                        <div className={`mt-6 p-6 rounded-2xl border flex items-start gap-4 animate-fade-in ${validationResult.success ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                          {validationResult.success ? <CheckCircleIcon className="h-6 w-6 shrink-0" /> : <AlertTriangleIcon className="h-6 w-6 shrink-0" />}
                          <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{validationResult.message}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4">
                      <ActivityIcon className="h-8 w-8 text-brand-gold" />
                      Network Statistics
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Block Height', value: blocks[0]?.index ? (blocks[0].index + 1).toLocaleString() : '0' },
                        { label: 'Current Difficulty', value: blocks[0]?.difficulty || '4' },
                        { label: 'Avg Block Time', value: '60s' },
                        { label: 'Network Hashrate', value: `${((blocks[0]?.difficulty || 4) * 1.5).toFixed(2)} MH/s` },
                        { label: 'Total Nodes', value: '14,205' },
                        { label: 'Protocol Version', value: 'v1.0.4-alpha' }
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
                          <p className="text-xl font-black text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40">
          <div className="flex items-center gap-3">
            <GlobeIcon className="h-5 w-5 text-brand-gold" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Protocol Status: Mainnet Online</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Block Height: {blocks[0]?.index ? (blocks[0].index + 1).toLocaleString() : '0'}</p>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Nodes: 14,205</p>
          </div>
        </div>
      </div>
    </div>
  );
};
