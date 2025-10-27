import React, { useState } from 'react';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/apiService';
import { LogoIcon } from './icons/LogoIcon';
import { auth } from '../services/firebase';

interface VerifyEmailPageProps {
  user: User;
  onLogout: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ user, onLogout }) => {
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { addToast } = useToast();

  const handleResend = async () => {
    setIsSending(true);
    try {
      await api.sendVerificationEmail();
      addToast('A new verification email has been sent. Please check your inbox (and spam folder).', 'success');
    } catch (error) {
      addToast('Failed to send verification email. Please try again later.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;

    setIsChecking(true);
    try {
        // This re-fetches the user's data from Firebase Auth backend
        await auth.currentUser.reload();

        // After reload, the user object is updated with the latest state
        if (auth.currentUser.emailVerified) {
            addToast("Email verified successfully! Welcome aboard.", "success");
            // The onAuthStateChanged listener in App.tsx should now see the updated
            // verification status and automatically navigate to the dashboard.
            // A hard refresh is a good fallback to ensure the app state is fully reset.
            setTimeout(() => window.location.reload(), 1000);
        } else {
            addToast("Your email is still not verified. Please find the email and click the verification link.", "info");
        }
    } catch (error) {
        console.error("Error checking verification status:", error);
        addToast("Could not check verification status. Please try again in a moment.", "error");
    } finally {
        setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-lg shadow-lg text-center animate-fade-in">
        <LogoIcon className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white mt-4">Verify Your Email Address</h2>
        <p className="text-gray-400 mt-2">
          A verification link has been sent to <strong className="text-green-400">{user.email}</strong>.
        </p>
        <p className="text-gray-300 mt-2 font-semibold">
          Please click the link in that email to activate your account.
        </p>
        <p className="text-sm text-yellow-400 mt-4">
          Can't find it? Be sure to check your <strong className="font-bold">spam or junk mail</strong> folder.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={isChecking}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-slate-500"
          >
            {isChecking ? 'Checking...' : "I've Verified My Email, Continue"}
          </button>
          <button
            onClick={handleResend}
            disabled={isSending}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-slate-500"
          >
            {isSending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </div>

        <div className="text-center mt-6 pt-4 border-t border-slate-700">
            <p className="text-gray-400 text-sm">Wrong account or email?</p>
            <button
                type="button"
                onClick={onLogout}
                className="inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400 mt-1"
            >
                Log Out and Use a Different Account
            </button>
        </div>
      </div>
    </div>
  );
};
