import React, { useState, useEffect, useRef } from 'react';
import { User, PublicUserProfile, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { useToast } from '../contexts/ToastContext';

interface ConnectionRadarProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onStartChat: (targetUserId: string) => void;
}

export const ConnectionRadar: React.FC<ConnectionRadarProps> = ({ currentUser, onViewProfile, onStartChat }) => {
  const [nearbyUsers, setNearbyUsers] = useState<PublicUserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVouching, setIsVouching] = useState(false);
  const { addToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const { users } = await api.getVentureMembers(50); 
        if (!isMounted) return;
        const others = users.filter(u => u.id !== currentUser.id);
        const sorted = others.sort((a, b) => {
            const aIsLocal = a.circle === currentUser.circle ? 1 : 0;
            const bIsLocal = b.circle === currentUser.circle ? 1 : 0;
            return bIsLocal - aIsLocal;
        });
        setNearbyUsers(sorted.slice(0, 12));
      } catch (error) {
        console.error("Failed to load radar users", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleUserClick = (user: PublicUserProfile) => {
    setSelectedUser(user);
  };

  const closeSelection = () => {
    setSelectedUser(null);
  };

  const handleVouch = async (user: PublicUserProfile) => {
      if (isVouching) return;
      if (!cryptoService.hasVault()) {
          addToast("IDENTITY_LOCK: Vault required to sign vouch.", "error");
          return;
      }
      setIsVouching(true);
      try {
          const timestamp = Date.now();
          const nonce = cryptoService.generateNonce();
          const payload = `VOUCH:${currentUser.id}:${user.id}:${timestamp}:${nonce}`;
          const signature = cryptoService.signTransaction(payload);
          
          await api.vouchForCitizen({
              id: `radar-vouch-${Date.now().toString(36)}`,
              senderId: currentUser.id,
              receiverId: user.id,
              amount: 0,
              timestamp,
              nonce,
              signature,
              hash: payload,
              senderPublicKey: currentUser.publicKey || "",
              parentHash: 'RADAR_HANDSHAKE',
              protocol_mode: 'MAINNET'
          });
          addToast(`Trust Anchor Signed for ${user.name}.`, "success");
      } catch (err: any) {
          addToast(err.message || "Vouch failed.", "error");
      } finally {
          setIsVouching(false);
      }
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-full bg-slate-900 rounded-xl border border-slate-700">
              <div className="text-center">
                  <LoaderIcon className="h-10 w-10 text-green-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Scanning for connections...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden flex items-center justify-center isolate" ref={containerRef}>
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute w-[30%] h-[30%] border border-green-500/20 rounded-full z-0 min-w-[100px] min-h-[100px] pointer-events-none"></div>
      <div className="absolute w-[55%] h-[55%] border border-green-500/20 rounded-full z-0 min-w-[180px] min-h-[180px] pointer-events-none"></div>
      <div className="absolute w-[80%] h-[80%] border border-green-500/10 rounded-full z-0 min-w-[260px] min-h-[260px] pointer-events-none"></div>
      <div className="absolute w-[80%] h-[80%] rounded-full z-0 animate-spin-slow pointer-events-none bg-gradient-conic from-green-500/10 via-transparent to-transparent min-w-[260px] min-h-[260px]"></div>

      <div className="absolute z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-16 h-16 bg-slate-800 rounded-full border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] flex items-center justify-center relative">
            <UserCircleIcon className="h-10 w-10 text-white" />
            <div className="absolute -bottom-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <span className="mt-2 text-xs font-bold text-green-400 bg-slate-900/80 px-2 py-0.5 rounded-full">YOU</span>
      </div>

      {nearbyUsers.map((user, index) => {
        const isInner = index < 6;
        const radius = isInner ? 25 : 38; 
        const offsetIndex = isInner ? index : index - 6;
        const totalInRing = isInner ? 6 : Math.max(1, nearbyUsers.length - 6);
        const randomOffset = (index % 2 === 0 ? 1 : -1) * (Math.random() * 0.3); 
        const angle = (offsetIndex / totalInRing) * 2 * Math.PI + randomOffset;
        const isLocal = user.circle === currentUser.circle;

        return (
          <button
            key={user.id}
            onClick={() => handleUserClick(user)}
            className={`absolute z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-125 focus:outline-none ring-2 ${selectedUser?.id === user.id ? 'bg-green-500 ring-white scale-125 z-40' : 'bg-slate-700 ring-slate-600 hover:bg-slate-600'}`}
            style={{ 
                left: `${50 + Math.cos(angle) * radius}%`,
                top: `${50 + Math.sin(angle) * radius}%`,
                transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-sm font-bold text-white">
                {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
            {isLocal && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900"></span>
            )}
          </button>
        );
      })}

      {selectedUser && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-500 p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 animate-fade-in flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-2 rounded-full border border-slate-600">
                    <UserCircleIcon className="h-12 w-12 text-gray-300" />
                </div>
                <div className="text-left flex-1 min-w-0">
                    <h3 className="font-bold text-white text-xl leading-tight truncate">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-300 truncate">{selectedUser.circle}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => { onStartChat(selectedUser.id); closeSelection(); }}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                    <MessageSquareIcon className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase">Chat</span>
                </button>
                <button 
                    onClick={() => handleVouch(selectedUser)}
                    disabled={isVouching}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-slate-950 border border-brand-gold/20 rounded-lg transition-all"
                >
                    {isVouching ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <ShieldCheckIcon className="h-5 w-5" />}
                    <span className="text-[10px] font-bold uppercase">Vouch</span>
                </button>
                <button 
                    onClick={() => { onViewProfile(selectedUser.id); closeSelection(); }}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                    <ArrowRightIcon className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase">Profile</span>
                </button>
            </div>
            <button onClick={closeSelection} className="absolute top-2 right-2 text-gray-400 hover:text-white p-2">✕</button>
        </div>
      )}
    </div>
  );
};