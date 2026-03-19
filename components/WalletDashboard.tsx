import React, { useState, useEffect } from 'react';
import { User, UbtTransaction, GlobalEconomy } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { WalletIcon } from './icons/WalletIcon';
import { SendIcon } from './icons/SendIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { SearchIcon } from './icons/SearchIcon';
import { Timestamp } from 'firebase/firestore';

interface WalletDashboardProps {
  user: User;
  onBack: () => void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({ user, onBack }) => {
  const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [memo, setMemo] = useState('');
  const [currentUser, setCurrentUser] = useState<User>(user);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubEconomy = api.listenForGlobalEconomy(setEconomy);
    const unsubTransactions = api.listenForUserTransactions(user.id, (txs) => {
      setTransactions(txs);
      setIsLoading(false);
    });

    // Refresh user data for balance
    const refreshUser = async () => {
        try {
            const updated = await api.getUser(user.id);
            setCurrentUser(updated);
        } catch (e) {
            console.error("Failed to refresh user balance", e);
        }
    };
    refreshUser();

    return () => {
      unsubEconomy();
      unsubTransactions();
    };
  }, [user.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !sendAmount || isSending) return;

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast("Please enter a valid amount.", "error");
      return;
    }

    if (amount > (currentUser.ubtBalance || 0)) {
      addToast("Insufficient balance.", "error");
      return;
    }

    setIsSending(true);
    try {
      const receiver = await api.getUserByEmail(receiverId) || await api.getUser(receiverId);
      if (!receiver) {
        addToast("Receiver not found. Please check the ID or email.", "error");
        setIsSending(false);
        return;
      }

      await api.sendUbt(currentUser, receiver.id, amount, memo || "Direct Transfer");
      addToast(`Successfully sent ${amount} UBT to ${receiver.name}`, "success");
      setSendAmount('');
      setReceiverId('');
      setMemo('');
      
      // Refresh balance
      const updated = await api.getUser(user.id);
      setCurrentUser(updated);
    } catch (error: any) {
      addToast(error.message || "Failed to send UBT", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white animate-fade-in overflow-y-auto no-scrollbar pb-20">
      <div className="max-w-4xl mx-auto w-full p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">My Wallet</h1>
              <p className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.3em] mt-2">Personal Node Assets</p>
            </div>
          </div>
          <div className="bg-brand-gold/10 p-3 rounded-2xl border border-brand-gold/20">
            <WalletIcon className="h-6 w-6 text-brand-gold" />
          </div>
        </div>

        {/* Balance Card */}
        <div className="pro-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-brand-gold/20 relative overflow-hidden shadow-glow-gold">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <WalletIcon className="h-32 w-32" />
          </div>
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em] mb-2">Available Balance</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-6xl font-black text-white tracking-tighter">{(currentUser.ubtBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                <span className="text-xl font-black text-brand-gold uppercase">UBT</span>
              </div>
            </div>
            
            {economy && (
              <div className="flex flex-wrap gap-6 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">USD Value</p>
                  <p className="text-lg font-black text-white/80">${((currentUser.ubtBalance || 0) * economy.ubt_to_usd_rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Current Rate</p>
                  <p className="text-lg font-black text-brand-gold">${economy.ubt_to_usd_rate.toFixed(4)} <span className="text-[10px] text-white/20">/ UBT</span></p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Node Public Key (Receive Address)</p>
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <code className="text-[10px] font-mono text-brand-gold truncate flex-1">{currentUser.publicKey || 'GENESIS_NODE'}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.publicKey || '');
                        addToast("Public key copied to clipboard", "success");
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <svg className="h-3 w-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Send Form */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <SendIcon className="h-5 w-5 text-brand-gold" />
              Send Assets
            </h3>
            <form onSubmit={handleSend} className="pro-card p-6 bg-slate-900/50 border-white/5 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Receiver Node (ID or Email)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-white/20" />
                  </div>
                  <input
                    type="text"
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    placeholder="Enter node ID or email..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-brand-gold transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Amount (UBT)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-brand-gold transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Memo (Optional)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="What is this for?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-brand-gold transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSending || !receiverId || !sendAmount}
                className="w-full bg-brand-gold hover:bg-brand-gold-light text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 shadow-glow-gold flex items-center justify-center gap-2"
              >
                {isSending ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                {isSending ? 'Processing...' : 'Execute Transfer'}
              </button>
            </form>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <TrendingUpIcon className="h-5 w-5 text-brand-gold" />
              Recent Activity
            </h3>
            <div className="pro-card bg-slate-900/50 border-white/5 overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <LoaderIcon className="h-8 w-8 animate-spin text-brand-gold mx-auto opacity-40" />
                    <p className="mt-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Syncing Ledger...</p>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {transactions.map((tx) => {
                      const isReceiver = tx.receiverId === user.id;
                      return (
                        <div key={tx.id} className="p-4 hover:bg-white/[0.02] transition-colors flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReceiver ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                              <TrendingUpIcon className={`h-5 w-5 ${isReceiver ? '' : 'rotate-180'}`} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-tight">{isReceiver ? 'Received' : 'Sent'}</p>
                              <p className="text-[10px] text-white/30 truncate max-w-[120px]">
                                {isReceiver ? `From: ${tx.senderId}` : `To: ${tx.receiverId}`}
                              </p>
                              <p className="text-[9px] text-brand-gold/60 italic truncate max-w-[120px]">{tx.reason || 'No memo'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${isReceiver ? 'text-green-400' : 'text-white'}`}>
                              {isReceiver ? '+' : '-'}{tx.amount.toLocaleString()}
                            </p>
                            <p className="text-[9px] text-white/20 uppercase tracking-tighter">
                              {tx.timestamp instanceof Timestamp ? tx.timestamp.toDate().toLocaleDateString() : new Date(tx.timestamp as any).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-sm font-bold text-white/20 uppercase tracking-widest">No transactions found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
