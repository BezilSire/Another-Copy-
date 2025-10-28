import React, { useState } from 'react';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onBountyCreated: () => void;
}

const SKILLS_LIST = ['Software Development', 'Marketing', 'Sales', 'Design (UI/UX)', 'Writing', 'Manual Labor', 'Tutoring', 'Consulting'];

export const CreateBountyModal: React.FC<CreateBountyModalProps> = ({ isOpen, onClose, user, onBountyCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [reward, setReward] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleSkillToggle = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ccapReward = parseInt(reward, 10);
    if (!title || !description || skills.length === 0 || isNaN(ccapReward) || ccapReward <= 0) {
      addToast('Please fill all fields with valid values.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createBounty(user, { title, description, requiredSkills: skills, reward: ccapReward });
      addToast('Bounty posted successfully!', 'success');
      onBountyCreated();
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to post bounty.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Post a New Bounty</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Required Skills</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {SKILLS_LIST.map(skill => (
                        <button type="button" key={skill} onClick={() => handleSkillToggle(skill)} className={`px-3 py-1 text-sm rounded-full ${skills.includes(skill) ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-300'}`}>{skill}</button>
                    ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Reward (CCAP)</label>
                <input type="number" value={reward} onChange={e => setReward(e.target.value)} min="1" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required />
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">
              {isSubmitting ? 'Posting...' : 'Post Bounty'}
            </button>
            <button type="button" onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};