import React, { useState } from 'react';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface CompleteProfilePageProps {
  user: User;
  onProfileComplete: (updatedData: Partial<User>) => Promise<void>;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ user, onProfileComplete }) => {
  // FIX: Added isProcessingAuth from useAuth context
  const { isProcessingAuth } = useAuth();
  const [formData, setFormData] = useState({
    phone: user.phone || '',
    address: user.address || '',
    bio: user.bio || '',
    profession: user.profession || '',
    skills: (user.skills || []).join(', '),
    id_card_number: user.id_card_number || '',
    circle: user.circle || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const required = ['phone', 'address', 'bio', 'profession', 'circle', 'id_card_number'];
    const missing = required.some(f => !(formData as any)[f]?.trim());

    if (missing) {
      addToast('Enter all mandatory identity nodes.', 'error');
      setIsSaving(false);
      return;
    }

    try {
      const skillsAsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      const dataToSubmit = { ...formData, skills: skillsAsArray, isProfileComplete: true };
      await onProfileComplete(dataToSubmit as Partial<User>);
      addToast('Identity anchored to mainnet.', 'success');
    } catch (error) {
      addToast('Sync failure.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 font-sans">
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/10 shadow-premium animate-fade-in relative overflow-hidden">
            <div className="corner-tl opacity-30"></div><div className="corner-tr opacity-30"></div>
            
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 mx-auto mb-6">
                    <ShieldCheckIcon className="h-10 w-10 text-brand-gold" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Identity Anchor</h2>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.4em] mt-3">Finalizing Protocol Induction</p>
            </div>

            <ProfileCompletionMeter profileData={{ ...user, ...formData }} role={user.role} />

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="Operational Node (Phone)" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+263..." />
                    <InputField label="Identity Seal (National ID)" name="id_card_number" value={formData.id_card_number} onChange={handleChange} required placeholder="ID_NUMBER" />
                    <InputField label="Designation (Profession)" name="profession" value={formData.profession} onChange={handleChange} required placeholder="E.G. DEVELOPER" />
                    <InputField label="Circle (Location)" name="circle" value={formData.circle} onChange={handleChange} required placeholder="E.G. HARARE" />
                </div>
                
                <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Sovereign Residence</label>
                    <input name="address" value={formData.address} onChange={handleChange} required className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl text-white font-bold placeholder-gray-700" placeholder="FULL PHYSICAL ADDRESS" />
                </div>

                <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Capability Profile (Comma Separated)</label>
                    <input name="skills" value={formData.skills} onChange={handleChange} className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl text-white font-mono text-xs uppercase" placeholder="MARKETING, TRADING, AGRI..." />
                </div>

                <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Citizen Narrative</label>
                    <textarea name="bio" rows={4} value={formData.bio} onChange={handleChange} required className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl text-white text-sm leading-relaxed" placeholder="Tell the community a little about your node purpose..."/>
                </div>

                <button type="submit" disabled={isSaving} className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-[12px] shadow-glow-gold transition-all active:scale-95 disabled:opacity-30">
                    {isProcessingAuth ? "Synchronizing..." : "Complete Handshake"}
                </button>
            </form>
        </div>
    </div>
  );
};

const InputField: React.FC<{label: string, name: string, value: string, onChange: any, required?: boolean, placeholder?: string}> = ({label, name, value, onChange, required, placeholder}) => (
    <div className="space-y-2">
        <label className="label-caps !text-[9px]">{label}</label>
        <input type="text" name={name} value={value} onChange={onChange} required={required} className="w-full bg-slate-900 border border-white/5 p-4 rounded-xl text-white font-bold placeholder-gray-700 uppercase" placeholder={placeholder} />
    </div>
);