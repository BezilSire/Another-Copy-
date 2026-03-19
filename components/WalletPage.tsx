import React, { useState, useEffect } from 'react';
import { MemberUser, GlobalEconomy, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { Timestamp } from 'firebase/firestore';
import { WalletIcon } from './icons/WalletIcon';
import { SendIcon } from './icons/SendIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { SearchIcon } from './icons/SearchIcon';
import { SendUbtModal } from './SendUbtModal';

interface WalletPageProps {
  user: MemberUser;
  economy: GlobalEconomy | null;
  onReconcile: () => void;
  isReconciling: boolean;
}

export const WalletPage: React.FC<WalletPageProps> = ({ user, economy, onReconcile, isReconciling }) => {
  const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const unsub = api.listenForUserTransactions(user.id, (txs) => {
      setTransactions(txs);
      setIsLoading(false);
    });
    return () => unsub();
  }, [user.id]);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] relative overflow-hidden shadow-premium">
        <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">UGC Available Assets</p>
            <div className="flex items-baseline gap-3">
              <p className="text-6xl font-black text-white tracking-tighter leading-none">{(user.ubtBalance || 0).toFixed(2)}</p>
              <p className="text-lg font-black text-brand-gold uppercase tracking-widest leading-none">UBT</p>
            </div>
            <p className="text-sm font-bold text-white/30 uppercase tracking-widest mt-4">
              ≈ ${( (user.ubtBalance || 0) * (economy?.ubt_to_usd_rate || 0) ).toFixed(2)} USD
            </p>
          </div>
          <div className="bg-brand-gold/10 p-4 rounded-2xl border border-brand-gold/20 shadow-glow-gold">
            <WalletIcon className="h-8 w-8 text-brand-gold" />
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button 
            onClick={() => setIsSendModalOpen(true)}
            className="flex-1 py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-[11px]"
          >
            <SendIcon className="h-5 w-5" />
            Send Assets
          </button>
          <button 
            onClick={onReconcile}
            disabled={isReconciling}
            className="px-6 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl transition-all active:scale-[0.98] border border-white/10 flex items-center justify-center disabled:opacity-50"
          >
            {isReconciling ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <RotateCwIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Transaction History</h3>
          <div className="h-px flex-1 bg-white/10 mx-6"></div>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Recent Activity</p>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoaderIcon className="h-8 w-8 animate-spin text-brand-gold opacity-40" />
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-white/5 border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-white/[0.08] transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${tx.receiverId === user.id ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <TrendingUpIcon className={`h-6 w-6 ${tx.receiverId === user.id ? '' : 'rotate-180'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase leading-none mb-1">
                      {tx.receiverId === user.id ? 'Received' : 'Sent'}
                    </p>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                      {tx.receiverId === user.id ? `From: ${tx.senderId}` : `To: ${tx.receiverId}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black leading-none mb-1 ${tx.receiverId === user.id ? 'text-green-400' : 'text-white'}`}>
                    {tx.receiverId === user.id ? '+' : '-'}{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    {tx.timestamp instanceof Timestamp ? tx.timestamp.toDate().toLocaleDateString() : new Date(tx.timestamp as any).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <p className="text-sm font-bold text-white/20 uppercase tracking-[0.3em]">No transaction records found</p>
            </div>
          )}
        </div>
      </div>

      {isSendModalOpen && (
        <SendUbtModal 
          isOpen={isSendModalOpen} 
          onClose={() => setIsSendModalOpen(false)} 
          currentUser={user} 
          onTransactionComplete={onReconcile}
        />
      )}
    </div>
  );
};
