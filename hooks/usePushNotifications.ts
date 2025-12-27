import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../services/firebase';
import { User } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';

const VAPID_KEY = "BB_ayCcLaO8nGet1CZfxcd1UwQSQ4LkUdahdKVAem7KC0Ts-uN7_L9rqgoR4XwLr3lsuR_3LE4LvZsQIdocbyDw";

export const usePushNotifications = (user: User | null) => {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { addToast } = useToast();
  const isRequestingRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (isRequestingRef.current) return;
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addToast("Dispatch Alerts not supported on this device/browser.", "info");
      return;
    }

    isRequestingRef.current = true;
    try {
      console.log("Requesting notification handshake...");
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        const messaging = await getMessagingInstance();
        if (messaging) {
          // Wait for service worker to be ready to ensure getToken doesn't hang
          const registration = await navigator.serviceWorker.ready;
          const currentToken = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          if (currentToken) {
            setFcmToken(currentToken);
            if (user && user.fcmToken !== currentToken) {
              await api.updateUser(user.id, { fcmToken: currentToken });
              console.log("Handshake stabilized. Token anchored.");
              addToast("Dispatch Alerts successfully anchored.", "success");
            }
          }
        }
      } else if (permissionResult === 'denied') {
          addToast("Handshake blocked at hardware level. Check browser settings.", "error");
      }
    } catch (error) {
      console.error('Handshake error:', error);
      addToast("Failed to stabilize dispatch handshake.", "error");
    } finally {
      isRequestingRef.current = false;
    }
  }, [user, addToast]);

  // Sync state with current system permission on mount/user change
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [user]);

  // Foreground message listener
  useEffect(() => {
    let unsubscribe: any;
    
    const setupListener = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        const messaging = await getMessagingInstance();
        if (messaging) {
            unsubscribe = onMessage(messaging, (payload) => {
                addToast(payload.notification?.title || 'Network Dispatch Received', 'info');
            });
        }
    };

    setupListener();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [addToast]);

  return { permission, requestPermission };
};