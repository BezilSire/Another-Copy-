
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { User, Member } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ProfileCompletionMeterProps {
  profileData: Partial<User & Member>;
  role: 'admin' | 'agent' | 'member';
}

export const ProfileCompletionMeter: React.FC<ProfileCompletionMeterProps> = ({ profileData, role }) => {
  const completionPercentage = useMemo(() => {
    let fieldsToCheck: (keyof (User & Member))[] = [];
    
    if (role === 'agent' || role === 'admin') {
      fieldsToCheck = ['phone', 'address', 'bio', 'id_card_number'];
    } else if (role === 'member') {
      fieldsToCheck = ['phone', 'address', 'bio', 'profession', 'skills', 'id_card_number'];
    }

    if (fieldsToCheck.length === 0) return 0;

    const filledCount = fieldsToCheck.reduce<number>((count, field) => {
      const value = profileData[field];
      if (Array.isArray(value)) {
        return count + (value.length > 0 ? 1 : 0);
      }
      return count + (value && String(value).trim() !== '' ? 1 : 0);
    }, 0);

    return Math.round((filledCount / fieldsToCheck.length) * 100);
  }, [profileData, role]);

  const barColor = completionPercentage === 100 ? 'bg-green-500' : 'bg-brand-gold';

  return (
    <div className="my-6 p-5 bg-slate-900/50 rounded-2xl border border-white/5 font-sans">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Status</h4>
        <div className="flex items-center space-x-2">
            {completionPercentage === 100 && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
            <span className="text-lg font-bold text-white tracking-tight">{completionPercentage}% Complete</span>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
       {completionPercentage < 100 && (
          <p className="text-xs text-slate-500 mt-3 font-medium">
              Adding more details helps community agents verify your account faster.
          </p>
      )}
    </div>
  );
};
