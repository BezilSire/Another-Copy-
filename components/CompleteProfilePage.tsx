import React, { useState } from 'react';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

const SKILLS_LIST = ['Software Development', 'Marketing', 'Sales', 'Product Management', 'Design (UI/UX)', 'Finance', 'Legal', 'Operations', 'Human Resources', 'Agriculture', 'Education', 'Healthcare'];
const LOOKING_FOR_LIST = ['Co-founder', 'Business Partner', 'Investor', 'Mentor', 'Advisor', 'Employee', 'Freelancer'];


interface CompleteProfilePageProps {
  user: User;
  onProfileComplete: (updatedData: Partial<User>) => Promise<void>;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ user, onProfileComplete }) => {
  const [formData, setFormData] = useState({
    phone: user.phone || '',
    address: user.address || '',
    bio: user.bio || '',
    // Member-specific fields
    profession: '',
    skills: '',
    interests: '',
    passions: '',
    gender: '',
    age: '',
    // Venture fields
    isLookingForPartners: false,
    lookingFor: [] as string[],
    businessIdea: '',
    // Agent-specific
    id_card_number: user.id_card_number || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

   const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === 'isLookingForPartners') {
      setFormData(prev => ({ ...prev, isLookingForPartners: checked }));
    } else { // For 'lookingFor' multi-select
      const value = e.target.value;
      setFormData(prev => ({
        ...prev,
        lookingFor: checked
          ? [...prev.lookingFor, value]
          : prev.lookingFor.filter(item => item !== value),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const requiredFields = user.role === 'member'
      ? ['phone', 'address', 'bio', 'profession']
      : ['phone', 'address', 'bio', 'id_card_number'];

    const isMissingFields = requiredFields.some(field => !(formData as any)[field]?.trim());

    if (isMissingFields) {
      addToast('Please fill in all required fields to continue.', 'error');
      setIsSaving(false);
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      await onProfileComplete(dataToSubmit as Partial<User>);
      // On success, the App component will automatically navigate away.
    } catch (error) {
      addToast('Failed to update profile. Please try again.', 'error');
    } finally {
      // This ensures the button is re-enabled even if navigation fails.
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>
            <p className="text-gray-400 mt-1 mb-6">Welcome to the community! Please provide some additional information to activate your account.</p>

            <ProfileCompletionMeter profileData={{ ...user, ...formData }} role={user.role} />

            <form onSubmit={handleSubmit} className="space-y-6">
                {user.role === 'member' && (
                    <>
                        <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2">Personal Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number <span className="text-red-400">*</span></label>
                                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            </div>
                            <div>
                                <label htmlFor="profession" className="block text-sm font-medium text-gray-300">Profession <span className="text-red-400">*</span></label>
                                <input type="text" name="profession" id="profession" value={formData.profession} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address <span className="text-red-400">*</span></label>
                            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio <span className="text-red-400">*</span></label>
                            <textarea name="bio" id="bio" rows={4} value={formData.bio} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Tell the community a little about yourself..."/>
                        </div>
                         <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2 pt-4">Ventures & Skills (Optional)</h3>
                         <div className="flex items-center">
                            <input type="checkbox" id="isLookingForPartners" name="isLookingForPartners" checked={formData.isLookingForPartners} onChange={handleCheckboxChange} className="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500" />
                            <label htmlFor="isLookingForPartners" className="ml-2 block text-sm text-gray-200">I'm open to business collaborations.</label>
                         </div>
                         {formData.isLookingForPartners && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <label htmlFor="businessIdea" className="block text-sm font-medium text-gray-300">Describe your business idea or what you'd like to work on.</label>
                                    <textarea name="businessIdea" id="businessIdea" rows={3} value={formData.businessIdea} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">What are you looking for?</label>
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {LOOKING_FOR_LIST.map(item => (
                                            <label key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                                <input type="checkbox" value={item} checked={formData.lookingFor.includes(item)} onChange={handleCheckboxChange} className="text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500"/>
                                                <span>{item}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="skills" className="block text-sm font-medium text-gray-300">Your skills (comma-separated)</label>
                                    <input type="text" name="skills" id="skills" value={formData.skills} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="e.g., Marketing, Software Development"/>
                                    <p className="text-xs text-gray-400 mt-1">Suggested: {SKILLS_LIST.slice(0, 4).join(', ')}...</p>
                                </div>
                            </div>
                         )}
                    </>
                )}

                 { (user.role === 'agent' || user.role === 'admin') && (
                     <>
                        <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg flex items-start space-x-3">
                            <AlertTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-yellow-200">Important Information</h4>
                                <p className="text-sm text-yellow-300 mt-1">To ensure account security and process commission payouts, please provide your phone number, ID card number, and address.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number <span className="text-red-400">*</span> <span className="text-yellow-400 text-xs">(for payouts)</span></label>
                                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            </div>
                            <div>
                                <label htmlFor="id_card_number" className="block text-sm font-medium text-gray-300">ID Card Number <span className="text-red-400">*</span> <span className="text-yellow-400 text-xs">(for verification)</span></label>
                                <input type="text" name="id_card_number" id="id_card_number" value={formData.id_card_number} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address <span className="text-red-400">*</span> <span className="text-yellow-400 text-xs">(for verification)</span></label>
                            <textarea name="address" id="address" rows={3} value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio <span className="text-red-400">*</span></label>
                            <textarea name="bio" id="bio" rows={4} value={formData.bio} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        </div>
                     </>
                 )}

                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <button type="submit" disabled={isSaving} className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-500">
                        {isSaving ? 'Saving...' : 'Save and Continue'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};