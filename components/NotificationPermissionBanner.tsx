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
    // Only show if permission is 'default' (not asked yet)
    // Check Notification.permission directly for the latest state
    const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
    
    if (currentPermission === 'default') {
        const timer = setTimeout(() => setIsVisible(true), 4000);
        return () => clearTimeout(timer);
    }
  }, [permission]);

  if (!isVisible || permission !== 'default') return null;

  const handleAction = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Authorize button triggered");
      onRequestPermission();
  };

  return (
    <div className="fixed bottom-28 left-4 right-4 z-[9999] sm:left-auto sm:right-8 sm:max-w-md animate-fade-in pointer-events-auto">
      <div className="module-frame glass-module p-6 rounded-[2.5rem] border border-brand-gold/40 shadow-[0_0_40px_-5px_rgba(212,175,55,0.4)] flex items-start gap-5 bg-slate-900/95 backdrop-blur-2xl">
        <div className="flex-shrink-0 bg-brand-gold/10 p-3 rounded-2xl border border-brand-gold/20 text-brand-gold">
            <BellIcon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-white uppercase tracking-widest">Enable Dispatch Alerts</h4>
          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed uppercase font-black tracking-widest opacity-80">
            Authorize push notifications to receive real-time network updates and peer handshake signatures.
          </p>
          <div className="mt-5 flex gap-3">
             <button 
                onClick={handleAction}
                className="px-6 py-2.5 bg-brand-gold text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-glow-gold active:scale-95 transition-all cursor-pointer hover:bg-brand-gold-light"
             >
                 Authorize
             </button>
             <button 
                onClick={() => setIsVisible(false)}
                className="px-4 py-2.5 bg-white/5 text-gray-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:text-white transition-all cursor-pointer"
             >
                 Later
             </button>
          </div>
        </div>
        <button 
            onClick={() => setIsVisible(false)} 
            className="text-gray-700 hover:text-white transition-colors p-1"
            aria-label="Close Banner"
        >
            <XCircleIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};