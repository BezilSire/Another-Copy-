
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

  // Function to sync token - safe to call in useEffect if permission is already granted
  const syncToken = useCallback(async () => {
    if (!user || Notification.permission !== 'granted') return;

    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        const registration = await navigator.serviceWorker.ready;
        const currentToken = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (currentToken && user.fcmToken !== currentToken) {
          setFcmToken(currentToken);
          await api.updateUser(user.id, { fcmToken: currentToken });
          console.log("Push token anchored to identity.");
        }
      }
    } catch (error) {
      console.error('Token sync failed:', error);
    }
  }, [user]);

  // Manual request - MUST be called from a click handler
  const requestPermission = useCallback(async () => {
    if (isRequestingRef.current) return;
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addToast("Notifications not supported on this device.", "info");
      return;
    }

    isRequestingRef.current = true;
    try {
      // Direct call to restricted API
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        await syncToken();
        addToast("Dispatch Alerts activated.", "success");
      } else if (permissionResult === 'denied') {
        addToast("Alerts blocked by browser settings.", "error");
      }
    } catch (error) {
      console.error('Permission request error:', error);
      addToast("Failed to stabilize notification handshake.", "error");
    } finally {
      isRequestingRef.current = false;
    }
  }, [syncToken, addToast]);

  // Background sync if already granted
  useEffect(() => {
    if (user && Notification.permission === 'granted' && !fcmToken) {
      syncToken();
    }
  }, [user, fcmToken, syncToken]);

  // Foreground listener
  useEffect(() => {
    let unsubscribe: any;
    const setupListener = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        const messaging = await getMessagingInstance();
        if (messaging) {
            unsubscribe = onMessage(messaging, (payload) => {
                addToast(payload.notification?.title || 'Network Dispatch', 'info');
            });
        }
    };
    setupListener();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [addToast]);

  return { permission, requestPermission };
};
