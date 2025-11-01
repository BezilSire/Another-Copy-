import React, { useState } from 'react';
import { NewPublicMemberData, User } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface CreatorSignupPageProps {
  creator: User;
  onRegister: (data: NewPublicMemberData, password: string) => Promise<void>;
  onBackToLogin: () => void;
}

export const CreatorSignupPage: React.FC<CreatorSignupPageProps> = ({ creator, onRegister, onBackToLogin }) => {
  const [formData, setFormData] = useState<NewPublicMemberData>({
    full_name: '',
    phone: '',
    email: '',
    circle: '',
    address: '',
    national_id: '',
    referralCode: creator.referralCode,
  });
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    setIsLoading(true);
    try {
      await onRegister(formData, password);
      // On success, App component will switch the view.
    } catch (err) {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
        <div className="flex flex-col items-center mb-6">
            <LogoIcon className="h-12 w-12 text-green-500" />
            <div className="flex items-center space-x-2 mt-4">
                 <UserCircleIcon className="h-8 w-8 text-gray-400" />
                 <h2 className="text-xl font-bold text-center text-white">Join {creator.name}'s Community</h2>
            </div>
            <p className="text-center text-gray-300 mt-2">Become a full member of the Global Commons 🇿🇼 and get exclusive access to {creator.name}'s content and mentorship.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">Full Name</label>
                    <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                </div>
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
            
            <p className="text-xs text-center text-gray-400 pt-2">By continuing, you agree to become a member of the Global Commons, which includes a one-time $10 registration fee for verification.</p>
            
            <div className="flex items-center justify-between pt-2">
                 <button
                    type="button"
                    onClick={onBackToLogin}
                    disabled={isLoading}
                    className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50"
                >
                    Back to Login
                </button>
                <button type="submit" disabled={isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-green-500 disabled:bg-gray-500">
                    {isLoading ? 'Creating Account...' : 'Join Now'}
                </button>
            </div>
        </form>
    </div>
  );
};