import React, { useState } from 'react';
import { User, PublicUserProfile, UbtTransaction } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { cryptoService } from '../services/cryptoService';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';

interface UserCardProps {
  user: PublicUserProfile;
  currentUser: User;
  onClick: () => void;
  isOnline?: boolean;
}

const StatusBadge: React.FC<{ status: User['status'] }> = ({ status }) => {
  if (status === 'active') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-brand-gold/10 text-brand-gold border border-brand-gold/20 uppercase tracking-widest">Verified_Node</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-slate-900 text-gray-600 border border-white/5 uppercase tracking-widest">Pending_Node</span>;
};

export const UserCard: React.FC<UserCardProps> = ({ user, currentUser, onClick, isOnline }) => {
  const [isVouching, setIsVouching] = useState(false);
  const { addToast } = useToast();
  const isOwnProfile = currentUser.id === user.id;

  const handleQuickVouch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVouching || isOwnProfile) return;

    if (!cryptoService.hasVault()) {
        addToast("IDENTITY_LOCK: Local vault required to sign vouches.", "error");
        return;
    }

    setIsVouching(true);
    try {
        const timestamp = Date.now();
        const nonce = cryptoService.generateNonce();
        const payload = `VOUCH:${currentUser.id}:${user.id}:${timestamp}:${nonce}`;
        const signature = cryptoService.signTransaction(payload);
        const txId = `vouch-quick-${Date.now().toString(36)}`;

        const transaction: UbtTransaction = {
            id: txId,
            senderId: currentUser.id,
            receiverId: user.id,
            amount: 0,
            timestamp: timestamp,
            nonce: nonce,
            signature: signature,
            hash: payload,
            senderPublicKey: currentUser.publicKey || "",
            parentHash: 'SOCIAL_CHAIN',
            type: 'VOUCH_ANCHOR',
            protocol_mode: 'MAINNET'
        };

        await api.vouchForCitizen(transaction);
        addToast(`Trust Anchor Signed for ${user.name}.`, "success");
    } catch (err: any) {
        addToast(err.message || "Vouch failed.", "error");
    } finally {
        setIsVouching(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="module-frame glass-module rounded-2xl p-5 hover:border-brand-gold/30 transition-all duration-300 cursor-pointer group shadow-xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-20 transition-opacity">
        <ShieldCheckIcon className="h-12 w-12 text-brand-gold" />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-slate-900 border border-white/5 group-hover:border-brand-gold/40 transition-all">
                <UserCircleIcon className="h-10 w-10 text-gray-600 group-hover:text-brand-gold/60 transition-colors" />
            </div>
            {isOnline && (
                <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-black shadow-glow-matrix"></span>
            )}
        </div>
        
        <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-sm truncate uppercase tracking-tight">{user.name}</h3>
            <p className="text-[10px] text-emerald-400 truncate font-black uppercase tracking-widest mt-1">{user.profession || "Citizen node"}</p>
            
            <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={user.status} />
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 border border-white/5">
                    {user.circle}
                </span>
            </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                Reputation: <span className="text-white">{user.credibility_score || 100}</span>
          </div>
          {!isOwnProfile && (
              <button 
                onClick={handleQuickVouch}
                disabled={isVouching}
                className="px-3 py-1.5 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-slate-950 border border-brand-gold/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-90 flex items-center gap-2"
              >
                {isVouching ? <LoaderIcon className="h-3 w-3 animate-spin"/> : <ShieldCheckIcon className="h-3 w-3" />}
                Vouch
              </button>
          )}
      </div>
    </div>
  );
};