import React from 'react';
import { User } from '../types';

interface ProfileCompletionMeterProps {
  user: User;
}

export const ProfileCompletionMeter: React.FC<ProfileCompletionMeterProps> = ({ user }) => {
  const fields = [
    { name: 'Name', value: user.name },
    { name: 'Phone', value: user.phone },
    { name: 'Address', value: user.address },
    { name: 'Bio', value: user.bio },
    { name: 'Skills', value: user.skills?.length },
    { name: 'Interests', value: user.interests?.length },
    { name: 'Public Key', value: user.publicKey },
  ];

  const completed = fields.filter(f => f.value).length;
  const percentage = Math.round((completed / fields.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Identity Sync Status</p>
          <p className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{percentage}%</p>
        </div>
        <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{completed}/{fields.length} Anchors</p>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <div 
          className="h-full bg-brand-gold shadow-glow-gold transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">
        Complete your identity anchors to unlock full protocol capabilities and increase your credibility score.
      </p>
    </div>
  );
};
