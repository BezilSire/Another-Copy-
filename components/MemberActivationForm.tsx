import React, { useState } from 'react';
import { Member } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface MemberActivationFormProps {
  member: Member;
  onActivate: (member: Member, password: string) => Promise<void>;
  onBack: () => void;
}

export const MemberActivationForm: React.FC<MemberActivationFormProps> = ({ member, onActivate, onBack }) => {
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    setIsLoading(true);
    try {
      await onActivate(member, password);
    } catch (err) {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Welcome back, {member.full_name}!</h2>
        <p className="text-center text-gray-400 mb-6">Let's activate your account. Please create a password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                <input type="email" name="email" id="email" value={member.email} readOnly className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md shadow-sm text-gray-400 sm:text-sm" />
            </div>

            <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
                    Create a Password
                </label>
                <div className="relative">
                    <input
                    id="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="shadow appearance-none border border-slate-600 bg-slate-700 rounded w-full py-2 px-3 text-white pr-10 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    disabled={isLoading}
                    />
                    <button
                    type="button"
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                    {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
                 <button
                    type="button"
                    onClick={onBack}
                    disabled={isLoading}
                    className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50"
                >
                    Back
                </button>
                <button type="submit" disabled={isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-green-500 disabled:bg-gray-500">
                    {isLoading ? 'Activating...' : 'Activate Account'}
                </button>
            </div>
        </form>
    </div>
  );
};