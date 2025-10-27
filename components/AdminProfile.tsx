

import React, { useState, useEffect } from 'react';
import { Admin, User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/apiService';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface AdminProfileProps {
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
}

export const AdminProfile: React.FC<AdminProfileProps> = ({ user, onUpdateUser }) => {
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
    // Sync form data if the user prop changes (e.g., after a save)
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
    setIsSaving(true);
    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        addToast('Name and email cannot be empty.', 'error');
        setIsSaving(false);
        return;
      }
      await onUpdateUser({ 
        name: formData.name, 
        phone: formData.phone,
        id_card_number: formData.id_card_number,
        address: formData.address,
        bio: formData.bio,
      });
    } catch (error) {
      addToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!window.confirm("Are you sure you want to send a password reset link to your email? You will be logged out if you proceed.")) {
        return;
    }
    setIsSendingReset(true);
    try {
        await api.sendPasswordReset(user.email);
        addToast(`A password reset link has been sent to ${user.email}.`, 'success');
    } catch {
        addToast("Failed to send password reset email.", "error");
    } finally {
        setIsSendingReset(false);
    }
  }
  
  const hasChanges = formData.name !== user.name || 
                     formData.email !== user.email || 
                     formData.phone !== (user.phone || '') ||
                     formData.id_card_number !== (user.id_card_number || '') ||
                     formData.address !== (user.address || '') ||
                     formData.bio !== (user.bio || '');

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-4">
            <div>
                <h2 className="text-2xl font-semibold text-white">Admin Profile & Settings</h2>
            </div>
            <div className="relative group flex items-center gap-1" title="Knowledge Points">
                <BookOpenIcon className="h-4 w-4 text-blue-400" />
                <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-blue-400">
                    {user.knowledgePoints ?? 0}
                </span>
            </div>
        </div>
      
      <ProfileCompletionMeter profileData={formData} role="admin" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-lg font-medium text-gray-200">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input type="email" name="email" id="email" value={formData.email} readOnly required className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md shadow-sm text-gray-400 sm:text-sm" />
             <p className="mt-2 text-xs text-gray-500">Email cannot be changed after registration.</p>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number</label>
            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
          </div>
          <div>
            <label htmlFor="id_card_number" className="block text-sm font-medium text-gray-300">ID Card Number</label>
            <input type="text" name="id_card_number" id="id_card_number" value={formData.id_card_number} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
          </div>
        </div>
        <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
            <textarea name="address" id="address" rows={3} value={formData.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
        </div>
        <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio</label>
            <textarea
              name="bio"
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell the community a little about yourself..."
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white"
            />
        </div>
        <div className="flex justify-end pt-4 border-t border-slate-700">
          <button type="submit" disabled={isSaving || !hasChanges} className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-500">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-medium text-gray-200">Security</h3>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-lg">
              <p className="text-sm text-gray-300">Request a secure link to reset your password.</p>
              <button onClick={handlePasswordReset} disabled={isSendingReset} className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500 disabled:bg-slate-500">
                {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
              </button>
          </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-medium text-gray-200 flex items-center">
            <HelpCircleIcon className="h-5 w-5 mr-2" />
            Help & Support
          </h3>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-lg">
              <p className="text-sm text-gray-300">Have questions or need assistance? Contact our support team.</p>
              <a href="mailto:support@globalcommons.app" className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500">
                Contact Support
              </a>
          </div>
      </div>
    </div>
  );
};