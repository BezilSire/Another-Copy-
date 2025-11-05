import React, { useState, useEffect } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { XCircleIcon } from './icons/XCircleIcon';

const APK_DOWNLOAD_URL = "https://ubuntium.org/Global_Commons_Network.apk";
const DISMISS_KEY = 'apkBannerDismissed';

export const AndroidApkBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // This component should only run on the client, so `navigator` is safe to use.
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      const dismissedTimestamp = localStorage.getItem(DISMISS_KEY);
      if (dismissedTimestamp) {
        // Show again after 30 days
        const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
        if (new Date().getTime() - parseInt(dismissedTimestamp, 10) > thirtyDaysInMillis) {
          localStorage.removeItem(DISMISS_KEY);
          setIsVisible(true);
        }
      } else {
        // Show if not dismissed before
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().getTime().toString());
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-slate-800 border-t border-slate-700 shadow-2xl p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4 animate-slide-up-banner z-50">
      <LogoIcon className="h-10 w-10 text-green-500 flex-shrink-0" />
      <div className="flex-grow min-w-0">
        <p className="font-bold text-white text-sm sm:text-base">Get the Official Android App</p>
        <p className="text-xs sm:text-sm text-gray-300 hidden sm:block">For a faster, smoother experience on the go.</p>
      </div>
      <a
        href={APK_DOWNLOAD_URL}
        download
        className="flex-shrink-0 inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 text-sm font-semibold"
        aria-label="Download the Android APK"
      >
        <DownloadIcon className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Download APK</span>
      </a>
      <button 
        onClick={handleDismiss} 
        className="flex-shrink-0 text-gray-400 hover:text-white" 
        aria-label="Dismiss download banner"
        title="Dismiss"
      >
        <XCircleIcon className="h-6 w-6" />
      </button>
    </div>
  );
};