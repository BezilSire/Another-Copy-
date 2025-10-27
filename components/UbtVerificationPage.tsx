import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';

interface UbtVerificationPageProps {
  user: User;
  onLogout: () => void;
}

export const UbtVerificationPage: React.FC<UbtVerificationPageProps> = ({ user, onLogout }) => {
  const WHATSAPP_LINK = "https://wa.me/447446959717?text=I%20already%20own%20%24UBT%20and%20need%20verification";
  const FOUNDER_ID_LINK = "https://ubuntium.org/founder-id";

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-lg max-w-lg mx-auto animate-fade-in">
      <div className="flex flex-col items-center mb-6 text-center">
        <LogoIcon className="h-12 w-12 text-green-500" />
        <h2 className="text-2xl font-bold text-white mt-4">One Last Step, {user.name}!</h2>
        <p className="text-gray-300 mt-2">
          Your registration is pending verification. To get full access to the commons, please confirm your stake.
        </p>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 text-center">
        <p className="text-gray-200">
          Do you own at least <strong>$10 in $UBT</strong>? This asset powers the global commons and represents your share in our collective future.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500"
          >
            Yes, I own $UBT
          </a>
          <a
            href={FOUNDER_ID_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-slate-600 text-base font-medium rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500"
          >
            No, I need to get $UBT
          </a>
        </div>
         <p className="text-xs text-gray-500 mt-4">
            <a href="https://ubuntium.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">What is $UBT?</a>
        </p>
      </div>
      
      <div className="text-center mt-8 pt-6 border-t border-slate-700">
        <p className="text-sm text-gray-400">Finished for now? You can log out and come back later.</p>
        <button
            onClick={onLogout}
            className="mt-2 inline-block align-baseline font-bold text-sm text-green-500 hover:text-green-400"
        >
            Log Out
        </button>
      </div>
    </div>
  );
};