import React, { useState } from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface CompleteProfilePageProps {
  user: User;
  onProfileComplete: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ user, onProfileComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    phone: user.phone || '',
    address: user.address || '',
    bio: user.bio || '',
    skills: user.skills?.join(', ') || '',
    interests: user.interests?.join(', ') || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedData = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        interests: formData.interests.split(',').map(s => s.trim()).filter(s => s),
        isProfileComplete: true,
        isCompletingProfile: true,
      };
      await onProfileComplete(updatedData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/20 relative overflow-hidden shadow-2xl">
        <div className="corner-tl !border-white/40"></div><div className="corner-tr !border-white/40"></div><div className="corner-bl !border-white/40"></div><div className="corner-br !border-white/40"></div>
        
        <div className="flex flex-col items-center mb-10 relative z-10 pt-4">
          <div className="w-16 h-16 bg-black rounded-2xl border-2 border-brand-gold/50 flex items-center justify-center shadow-glow-gold mb-6">
              <LogoIcon className="h-10 w-10 text-brand-gold" />
          </div>
          <h2 className="text-3xl font-black text-center text-white tracking-tighter uppercase gold-text leading-none">Anchor Identity</h2>
          <p className="label-caps mt-2 !text-brand-gold !tracking-[0.4em] !text-[10px]">Node Personalization Protocol</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="label-caps pl-1 !text-white !font-black">Phone Number</label>
            <input 
              type="text" 
              value={formData.phone} 
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} 
              className="w-full bg-slate-900 border-2 border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold" 
              placeholder="+263 7xx xxx xxx" 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="label-caps pl-1 !text-white !font-black">Physical Address</label>
            <input 
              type="text" 
              value={formData.address} 
              onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} 
              className="w-full bg-slate-900 border-2 border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold" 
              placeholder="city, area" 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="label-caps pl-1 !text-white !font-black">Bio</label>
            <textarea 
              value={formData.bio} 
              onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))} 
              className="w-full bg-slate-900 border-2 border-white/10 rounded-xl py-4 px-6 text-white text-base focus:outline-none focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold transition-all font-bold min-h-[100px]" 
              placeholder="who are you in the commons?" 
              required 
            />
          </div>

          <button
            type="submit"
            className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.4em] text-[12px] mt-4 flex items-center justify-center gap-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Anchoring..." : "Anchor Identity"}
            {!isSubmitting && <CheckCircleIcon className="h-5 w-5" />}
          </button>

          <button type="button" onClick={onCancel} className="w-full text-center text-xs font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
};
