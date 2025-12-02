
import React, { useState, useEffect } from 'react';
import { BellIcon } from './icons/BellIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface NotificationPermissionBannerProps {
  permission: NotificationPermission;
  onRequestPermission: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({ permission, onRequestPermission }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if permission is 'default' (not asked yet) and browser supports it
    if (typeof window !== 'undefined' && 'Notification' in window && permission === 'default') {
        setIsVisible(true);
    }
  }, [permission]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-800 border border-green-500/50 rounded-lg shadow-2xl p-4 animate-fade-in">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 bg-green-900/50 p-2 rounded-full">
            <BellIcon className="h-6 w-6 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Enable Notifications</p>
          <p className="text-xs text-gray-300 mt-1">
            Stay updated! Allow the Commons to send you alerts even when you're not using the app.
          </p>
          <div className="mt-3 flex space-x-3">
             <button 
                onClick={onRequestPermission}
                className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-md transition-colors"
             >
                 Allow Notifications
             </button>
             <button 
                onClick={() => setIsVisible(false)}
                className="text-xs text-gray-400 hover:text-white font-medium px-2 py-1.5"
             >
                 Later
             </button>
          </div>
        </div>
        <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-white">
            <XCircleIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
