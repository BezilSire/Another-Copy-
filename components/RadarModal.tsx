import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { GlobeIcon } from './icons/GlobeIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface RadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
}

export const RadarModal: React.FC<RadarModalProps> = ({ isOpen, onClose, currentUser, onViewProfile, onStartChat }) => {
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchNearby = async () => {
        try {
          const users = await api.getNearbyUsers(currentUser.id);
          setNearbyUsers(users);
        } catch (err) {
          addToast("Failed to scan for nearby nodes.", "error");
        } finally {
          setIsLoading(false);
        }
      };
      fetchNearby();
    }
  }, [isOpen, currentUser.id, addToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-midnight-light border border-white/10 rounded-[4rem] p-10 max-w-2xl w-full shadow-premium relative overflow-hidden h-[80vh] flex flex-col">
        <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
        
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brand-gold/10 rounded-3xl border-2 border-brand-gold/30 flex items-center justify-center shadow-glow-gold animate-pulse">
              <GlobeIcon className="h-8 w-8 text-brand-gold" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Identity Radar</h3>
              <p className="text-[10px] font-bold text-brand-gold tracking-[0.4em] uppercase opacity-60 mt-2">Scanning Protocol Mesh</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <XCircleIcon className="h-8 w-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-40" />
              <p className="mt-4 text-sm font-bold text-white/30 uppercase tracking-widest">Scanning local mesh...</p>
            </div>
          ) : nearbyUsers.length > 0 ? (
            nearbyUsers.map((user) => (
              <div key={user.id} className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between hover:bg-white/[0.08] transition-all group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl border-2 border-brand-gold/20 flex items-center justify-center group-hover:border-brand-gold/50 transition-all">
                    <UserCircleIcon className="h-8 w-8 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white uppercase tracking-tighter leading-none mb-1">{user.name}</p>
                    <p className="text-[10px] font-bold text-brand-gold tracking-[0.3em] uppercase opacity-60">{user.role} Node</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onViewProfile(user.id)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all active:scale-[0.98] border border-white/10 uppercase tracking-widest text-[10px]"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => onStartChat(user.id)}
                    className="px-6 py-3 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-glow-gold uppercase tracking-widest text-[10px]"
                  >
                    Comms
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem]">
              <p className="text-sm font-bold text-white/20 uppercase tracking-[0.3em]">No other nodes detected in the local mesh.</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">Protocol: Direct Peer Discovery Active</p>
        </div>
      </div>
    </div>
  );
};
