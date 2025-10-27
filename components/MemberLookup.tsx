import React, { useState } from 'react';
import { LogoIcon } from './icons/LogoIcon';

interface MemberLookupProps {
  onLookup: (email: string) => Promise<void>;
  onBack: () => void;
  message: string | null;
}

export const MemberLookup: React.FC<MemberLookupProps> = ({ onLookup, onBack, message }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    await onLookup(email);
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <LogoIcon className="h-12 w-12 text-green-500" />
        <h2 className="text-2xl font-bold text-center text-white mt-4">Member Registration</h2>
        <p className="text-gray-400 text-center mt-1">Let's check if you're already in our system.</p>
      </div>
      
      {message ? (
        <div className="p-4 text-center bg-blue-900/50 border border-blue-700 rounded-lg">
            <p className="text-blue-200">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="lookup-email">
                Enter Your Email Address
            </label>
            <input
                id="lookup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadow appearance-none border border-slate-600 bg-slate-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="your-email@example.com"
                required
                disabled={isLoading}
            />
            </div>
            <div className="flex items-center justify-end">
            <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-slate-500"
                disabled={isLoading}
            >
                {isLoading ? 'Checking...' : 'Continue'}
            </button>
            </div>
        </form>
      )}

      <div className="text-center mt-6 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};
