import React, { useState, useEffect } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { LogoIcon } from './icons/LogoIcon';
import { ShareIcon } from './icons/ShareIcon';
import { AddToHomeScreenIcon } from './icons/AddToHomeScreenIcon';


// Define the event type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}


export const AppInstallBanner: React.FC = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // More robust check for iOS devices (including iPads on desktop mode).
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Cross-browser check for standalone mode. `standalone` is for older iOS.
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    // --- Logic for iOS custom banner ---
    if (isIOSDevice && !isInStandaloneMode) {
      const isDismissed = localStorage.getItem('iosInstallBannerDismissed');
      if (!isDismissed) {
        setIsIos(true);
        setIsVisible(true);
      }
      // If it's iOS, we don't need the `beforeinstallprompt` listener, so we exit early.
      return; 
    }

    // --- Logic for Android/Desktop install prompt ---
    // This part of the effect will not run on iOS devices.
    const handleBeforeInstallPrompt = (event: Event) => {
        // Prevent the mini-infobar from appearing on mobile
        event.preventDefault();

        // Check if the banner has been dismissed before
        const isDismissed = localStorage.getItem('appInstallBannerDismissed');
        if (!isDismissed) {
            // Stash the event so it can be triggered later.
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
            // Show the custom install banner.
            setIsVisible(true);
        }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }
    // Show the browser's install prompt.
    installPromptEvent.prompt();
    // Wait for the user to respond to the prompt.
    await installPromptEvent.userChoice;
    // We've used the prompt, and can't use it again, so clear it.
    setInstallPromptEvent(null);
    // Hide the banner regardless of the outcome.
    setIsVisible(false);
  };

  const handleDismiss = () => {
    if (isIos) {
        localStorage.setItem('iosInstallBannerDismissed', 'true');
    } else {
        localStorage.setItem('appInstallBannerDismissed', 'true');
    }
    setIsVisible(false);
  };
  
  const renderIosBanner = () => (
     <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4 flex items-center space-x-4 animate-fade-in z-50">
        <LogoIcon className="h-10 w-10 text-green-500 flex-shrink-0" />
        <div className="flex-grow">
            <p className="font-bold text-white text-sm">Install the Ubuntium App</p>
            <p className="text-xs text-gray-300">
                Tap the <ShareIcon className="inline-block h-4 w-4 mx-0.5" /> icon, then scroll down and tap <AddToHomeScreenIcon className="inline-block h-4 w-4 mx-0.5" /> 'Add to Home Screen'.
            </p>
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-white" title="Dismiss">
            <XCircleIcon className="h-6 w-6" />
        </button>
    </div>
  );

  const renderAndroidBanner = () => (
     <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4 flex items-center space-x-4 animate-fade-in z-50">
      <LogoIcon className="h-10 w-10 text-green-500 flex-shrink-0" />
      <div className="flex-grow">
        <p className="font-bold text-white">Install Ubuntium App</p>
        <p className="text-sm text-gray-300">Add to your home screen for a better experience.</p>
      </div>
      <button
        onClick={handleInstallClick}
        className="flex-shrink-0 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 text-sm"
      >
        <DownloadIcon className="h-4 w-4 mr-2" />
        Install
      </button>
      <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-white" title="Dismiss">
        <XCircleIcon className="h-6 w-6" />
      </button>
    </div>
  );

  if (!isVisible) {
    return null;
  }
  
  if (isIos) {
      return renderIosBanner();
  }

  if(installPromptEvent) {
      return renderAndroidBanner();
  }

  return null;
};
