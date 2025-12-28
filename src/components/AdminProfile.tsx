import React, { useState, useEffect } from 'react';
import { Admin, User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/apiService';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { IdentityVault } from './IdentityVault';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LockIcon } from './icons/LockIcon';

interface AdminProfileProps {
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
}

export const AdminProfile: React.FC<AdminProfileProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'security'>('identity');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    id_card_number: user.id_card_number || '',
    address: user.address || '',
    bio: user.bio || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        id_card_number: user.id_card_number || '',
        address: user.address || '',
        bio: user.bio || '',
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      addToast('Name and email cannot be empty.', 'error');
      return;
    }
    setIsSaving(true);
    try {
        await onUpdateUser({ 
            phone: formData.phone,
            id_card_number: formData.id_card_number,
            address: formData.address,
            bio: formData.bio,
        });
    } catch (error) {
        console.error("Update failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!window.confirm("Send a password reset link to your email? You will need to re-authenticate.")) {
        return;
    }
    setIsSendingReset(true);
    try {
        await api.sendPasswordReset(user.email);
        addToast(`Recovery dispatched to ${user.email}.`, 'success');
    } catch {
        addToast("Reset failure.", "error");
    } finally {
        setIsSendingReset(false);
    }
  }
  
  const hasChanges = formData.phone !== (user.phone || '') ||
                     formData.id_card_number !== (user.id_card_number || '') ||
                     formData.address !== (user.address || '') ||
                     formData.bio !== (user.bio || '');

  return (
    <div className="space-y-10 animate-fade-in max-w-4xl mx-auto pb-20">
      <div className="flex bg-slate-950/80 p-1.5 rounded-[2rem] border border-white/5 shadow-2xl w-fit mx-auto sm:mx-0">
          <button 
              onClick={() => setActiveTab('identity')}
              className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${activeTab === 'identity' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
          >
              Identity Node
          </button>
          <button 
              onClick={() => setActiveTab('security')}
              className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${activeTab === 'security' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-gray-600 hover:text-gray-300'}`}
          >
              Security Protocol
          </button>
      </div>

      {activeTab === 'identity' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-slate-900/60 p-8 sm:p-12 rounded-[3.5rem] border border-white/5 shadow-premium">
              <div className="flex items-center gap-6 mb-12 border-b border-white/5 pb-8">
                  <div className="p-4 bg-brand-gold/10 rounded-2xl border border-brand-gold/20">
                      <UserCircleIcon className="h-8 w-8 text-brand-gold" />
                  </div>
                  <div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Authority Profile</h2>
                      <p className="label-caps !text-[9px] !text-gray-500 mt-2">Node designation management</p>
                  </div>
              </div>

              <ProfileCompletionMeter profileData={formData} role="admin" />

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-caps !text-[9px] pl-1">Full Designation</label>
                    <input type="text" value={formData.name} readOnly className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-gray-500 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps !text-[9px] pl-1">Comms Address</label>
                    <input type="email" value={formData.email} readOnly className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-gray-500 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps !text-[9px] pl-1">Operational Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold focus:ring-1 focus:ring-brand-gold/40 outline-none transition-all" placeholder="+263..." />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps !text-[9px] pl-1">Identity Seal (ID)</label>
                    <input type="text" name="id_card_number" value={formData.id_card_number} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold focus:ring-1 focus:ring-brand-gold/40 outline-none transition-all" placeholder="ID NUMBER" />
                  </div>
                </div>
                <div className="space-y-2">
                    <label className="label-caps !text-[9px] pl-1">Sovereign Residence</label>
                    <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold focus:ring-1 focus:ring-brand-gold/40 outline-none transition-all" placeholder="FULL PHYSICAL ADDRESS" />
                </div>
                <div className="space-y-2">
                    <label className="label-caps !text-[9px] pl-1">Node Narrative</label>
                    <textarea name="bio" rows={4} value={formData.bio} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm leading-relaxed focus:ring-1 focus:ring-brand-gold/40 outline-none transition-all" placeholder="Tell the community about your node purpose..."/>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button type="submit" disabled={isSaving || !hasChanges} className="px-12 py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95 transition-all disabled:opacity-30">
                    {isSaving ? 'Synchronizing...' : 'Sync Identity'}
                  </button>
                </div>
              </form>
          </div>

          <div className="lg:col-span-4 space-y-8">
              <div className="module-frame glass-module p-8 rounded-[3rem] border-white/5 shadow-xl text-center space-y-6">
                   <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto border border-white/10">
                       <HelpCircleIcon className="h-6 w-6 text-gray-500" />
                   </div>
                   <div>
                       <h4 className="text-sm font-black text-white uppercase tracking-widest">Support Portal</h4>
                       <p className="text-[9px] text-gray-500 mt-2 uppercase font-bold leading-loose">Direct line to protocol engineering and global mediation.</p>
                   </div>
                   <a href="mailto:authority@ubuntium.org" className="block w-full py-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">Contact Core</a>
              </div>

              <div className="p-8 bg-blue-900/10 border border-blue-500/20 rounded-[3rem] space-y-6">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-3">
                      <BookOpenIcon className="h-4 w-4" /> Authority Manual
                  </h4>
                  <p className="text-[9px] text-blue-300/80 leading-loose uppercase font-black italic">
                      Admins are nodes of pure trust. Every state update you sign is broadcasted to the global spectrum and immutable on the public ledger.
                  </p>
              </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
            <div className="p-8 bg-red-950/20 border-2 border-red-500/30 rounded-[3rem] flex items-center gap-6 shadow-xl">
                <div className="p-4 bg-red-500 rounded-2xl text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    <ShieldCheckIcon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Cryptographic Security</h3>
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.4em] mt-3">Sovereign Vault & Lazarus Rotation</p>
                </div>
            </div>
            
            <IdentityVault onRestore={() => setActiveTab('identity')} />

            <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-gray-500">
                        <LockIcon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Master Reset</h4>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-black/40 p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-loose">Initiate a password reset via the cloud authentication layer.</p>
                    <button onClick={handlePasswordReset} disabled={isSendingReset} className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all">
                        {isSendingReset ? 'Processing...' : 'Send Reset Link'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};