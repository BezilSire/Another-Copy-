import React, { useState } from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';

interface LoginPageProps {
  onLogin: (user: Pick<User, 'email' | 'password'>) => Promise<void>;
  onSwitchToSignup: () => void;
  onSwitchToPublicSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToSignup, onSwitchToPublicSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin({ email, password });
      // On success, the component will unmount, so no need to setLoading(false)
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false); // On failure, re-enable the form
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <LogoIcon className="h-12 w-12 text-green-500" />
        <h2 className="text-2xl font-bold text-center text-white mt-4">The Global Commons Network</h2>
        <p className="text-gray-400 text-center mt-1">Welcome Member or Agent</p>
      </div>
      <form onSubmit={handleSubmit}>
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
            placeholder="your-email@example.com"
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-2">
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
              placeholder="******************"
              required
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
        <div className="text-right mb-4">
            <button
                type="button"
                onClick={onSwitchToForgotPassword}
                disabled={isLoading}
                className="inline-block align-baseline font-bold text-xs text-green-500 hover:text-green-400 disabled:opacity-50"
            >
                Forgot Password?
            </button>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-slate-500"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={onSwitchToSignup}
            disabled={isLoading}
            className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50"
          >
            Agent Signup
          </button>
        </div>
      </form>
       <div className="text-center mt-6 pt-4 border-t border-slate-700">
            <p className="text-gray-400 text-sm">New to the community?</p>
            <button
                type="button"
                onClick={onSwitchToPublicSignup}
                disabled={isLoading}
                className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 disabled:opacity-50 mt-1"
            >
                Start Here to Become a Member
            </button>
        </div>
    </div>
  );
};