import React, { useState } from 'react';
import { Agent } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface SignupPageProps {
  onSignup: (user: Pick<Agent, 'name' | 'email' | 'password' | 'circle'>) => Promise<void>;
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [circle, setCircle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        await onSignup({ name, email, password, circle });
    } catch (error) {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <LogoIcon className="h-12 w-12 text-green-500" />
        <h2 className="text-2xl font-bold text-center text-white mt-4">Create Agent Account</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow appearance-none border border-slate-600 bg-slate-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border border-slate-600 bg-slate-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="circle">
            Circle (Area of Operation)
          </label>
          <input
            id="circle"
            type="text"
            value={circle}
            onChange={(e) => setCircle(e.target.value)}
            className="shadow appearance-none border border-slate-600 bg-slate-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., Kampala"
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border border-slate-600 bg-slate-700 rounded w-full py-2 px-3 text-white pr-10 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
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
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-slate-500"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={isLoading}
            className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50"
          >
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
  );
};