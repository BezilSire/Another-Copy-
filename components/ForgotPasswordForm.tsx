import React, { useState } from 'react';

interface ForgotPasswordFormProps {
  onReset: (email: string) => Promise<void>;
  onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onReset, onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
        await onReset(email);
        // On success, the parent component shows a toast and switches view.
    } catch (error) {
        setIsLoading(false); // Only reset loading on error
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center text-white mb-2">Reset Your Password</h2>
      <p className="text-gray-400 text-center mt-1 mb-6">Enter your email and we'll send you a link to get back into your account.</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="reset-email">
            Email Address
          </label>
          <input
            id="reset-email"
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
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>

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