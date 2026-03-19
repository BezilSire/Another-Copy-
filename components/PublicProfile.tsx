import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface PublicProfileProps {
  userId: string;
  currentUser: User;
  onBack: () => void;
  onStartChat: (userId: string) => void;
  onViewProfile: (userId: string) => void;
  isAdminView?: boolean;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({ userId, currentUser, onBack, onStartChat, onViewProfile, isAdminView }) => {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getPublicUserProfile(userId);
        setProfile(data);
      } catch (err) {
        addToast("Failed to load profile.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [userId, addToast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-40" />
        <p className="mt-4 text-sm font-bold text-white/30 uppercase tracking-widest">Accessing Identity Matrix...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-sm font-bold text-white/30 uppercase tracking-widest">Identity not found in the protocol.</p>
        <button onClick={onBack} className="mt-6 text-brand-gold font-black uppercase tracking-widest text-xs">Return to Node</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-24">
      <button onClick={onBack} className="flex items-center gap-3 text-white/40 hover:text-white transition-colors mb-10 group">
        <ArrowLeftIcon className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to Node</span>
      </button>

      <div className="bg-white/5 border border-white/10 p-10 rounded-[4rem] relative overflow-hidden shadow-premium">
        <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-brand-gold/10 rounded-[2.5rem] border-2 border-brand-gold/30 flex items-center justify-center shadow-glow-gold mb-8">
            <UserCircleIcon className="h-16 w-16 text-brand-gold" />
          </div>
          
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">{profile.name}</h2>
          <div className="flex items-center gap-2 mb-8">
            <ShieldCheckIcon className="h-4 w-4 text-brand-gold opacity-60" />
            <p className="text-xs font-bold text-brand-gold tracking-[0.4em] uppercase opacity-60">{profile.role} Node</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-10">
            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Circle</p>
              <p className="text-lg font-black text-white uppercase tracking-tighter">{profile.circle || 'GLOBAL'}</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Credibility</p>
              <p className="text-lg font-black text-green-400 uppercase tracking-tighter">{profile.credibility_score || 100}</p>
            </div>
          </div>

          <div className="w-full space-y-6 text-left mb-10">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Identity Bio</p>
              <div className="bg-white/5 border border-white/5 p-6 rounded-3xl text-sm font-medium text-white/70 leading-relaxed">
                {profile.bio || 'No bio provided for this identity.'}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Skills & Expertise</p>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(profile.skills) && profile.skills.length > 0 ? profile.skills.map(skill => (
                  <span key={skill} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white/60 uppercase tracking-widest">{skill}</span>
                )) : <p className="text-xs font-bold text-white/20 uppercase tracking-widest pl-2">No skills listed.</p>}
              </div>
            </div>
          </div>

          {currentUser.id !== profile.id && (
            <button 
              onClick={() => onStartChat(profile.id)}
              className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold flex items-center justify-center gap-3 uppercase tracking-[0.4em] text-[12px]"
            >
              <MessageSquareIcon className="h-6 w-6" />
              Initiate Comms
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
