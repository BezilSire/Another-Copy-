import React from 'react';
import { Member, PublicUserProfile } from '../types';
import { LogoIcon } from './icons/LogoIcon';

interface MemberCardProps {
  user: PublicUserProfile;
}

export const MemberCard: React.FC<MemberCardProps> = ({ user }) => {
  const joinedDate = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown';
  
  return (
    <div className="aspect-[1.586/1] w-full max-w-md mx-auto bg-slate-900 rounded-2xl p-6 shadow-2xl border border-yellow-500/30 flex flex-col justify-between relative overflow-hidden animate-fade-in">
        {/* Background gradient effect */}
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-slate-800 via-slate-900 to-black -z-10"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
                <LogoIcon className="h-10 w-10 text-yellow-400" />
                <div>
                    <h2 className="text-lg font-bold text-white tracking-wider">UBUNTIUM</h2>
                    <p className="text-xs text-yellow-400/80 tracking-widest">GLOBAL COMMONS</p>
                </div>
            </div>
            <p className="font-mono text-xs text-slate-500">MEMBER</p>
        </div>

        {/* Body */}
        <div className="flex-grow flex flex-col justify-center items-center text-center">
            <h1 className="text-3xl font-bold text-white">{user.name}</h1>
            <p className="mt-1 text-yellow-400 font-semibold">{user.circle} Circle</p>
        </div>

        {/* Footer */}
        <div className="text-center">
             <p className="text-sm italic text-slate-300">"I am because we are."</p>
            <div className="mt-4 flex justify-between items-end font-mono text-xs text-slate-400">
                <span>ID: UGC-M-********</span>
                <span>Joined: {joinedDate}</span>
            </div>
        </div>
    </div>
  );
};
