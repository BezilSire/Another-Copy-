import React, { useState, useEffect } from 'react';
import { NewPublicMemberData } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface PublicRegistrationPageProps {
  onRegister: (data: NewPublicMemberData, password: string) => Promise<void>;
  onBackToLogin: () => void;
  isProcessing: boolean;
}

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({ onRegister, onBackToLogin, isProcessing }) => {
  const [formData, setFormData] = useState<NewPublicMemberData>({
    full_name: '',
    email: '',
    referralCode: '',
  });
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'referralCode') {
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    await onRegister(formData, password).catch(() => {
        // Errors are handled by parent context
    });
  };
  
  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
        <div className="flex flex-col items-center mb-6">
            <LogoIcon className="h-12 w-12 text-green-500" />
            <h2 className="text-2xl font-bold text-center text-white mt-4">Become a Member</h2>
            <p className="text-center text-gray-400 mb-6">Let's start with the basics. You can add more details to your profile later.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">Full Name</label>
                <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
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
                    disabled={isProcessing}
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
            
            <div>
                <label htmlFor="referralCode" className="block text-sm font-medium text-gray-300">Referral Code (Optional)</label>
                <input type="text" name="referralCode" id="referralCode" value={formData.referralCode} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            
            <div className="flex items-center justify-between pt-2">
                 <button
                    type="button"
                    onClick={onBackToLogin}
                    disabled={isProcessing}
                    className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50"
                >
                    Back to Login
                </button>
                <button type="submit" disabled={isProcessing} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-green-500 disabled:bg-gray-500">
                    {isProcessing ? 'Creating Account...' : 'Create Account'}
                </button>
            </div>
        </form>
    </div>
  );
};