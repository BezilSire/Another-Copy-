import React, { useState } from 'react';
import { NewPublicMemberData } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface MemberSignupFormProps {
  email: string;
  onRegister: (data: NewPublicMemberData, password: string) => Promise<void>;
  onBack: () => void;
}

export const MemberSignupForm: React.FC<MemberSignupFormProps> = ({ email, onRegister, onBack }) => {
  const [formData, setFormData] = useState<NewPublicMemberData>({
    full_name: '',
    phone: '',
    email: email,
    circle: '',
    address: '',
    national_id: '',
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
      // Error toast is handled by the parent component.
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Create Your Member Account</h2>
        <p className="text-center text-gray-400 mb-6">Welcome! Complete your registration below.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                <input type="email" name="email" id="email" value={formData.email} readOnly className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md shadow-sm text-gray-400 sm:text-sm" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">Full Name</label>
                    <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                </div>
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
                <input type="text" name="address" id="address" placeholder="123 Ubuntu Lane..." value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="circle" className="block text-sm font-medium text-gray-300">Circle (Your City/Area)</label>
                    <input type="text" name="circle" id="circle" placeholder="e.g. Kampala" value={formData.circle} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="national_id" className="block text-sm font-medium text-gray-300">National ID / Passport</label>
                    <input type="text" name="national_id" id="national_id" value={formData.national_id} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
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
                    {isLoading ? 'Creating Account...' : 'Complete Registration'}
                </button>
            </div>
        </form>
    </div>
  );
};