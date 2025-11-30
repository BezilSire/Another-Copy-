
import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../services/firebase';
import { User } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';

// Your VAPID Public Key
const VAPID_KEY = "BB_ayCcLaO8nGet1CZfxcd1UwQSQ4LkUdahdKVAem7KC0Ts-uN7_L9rqgoR4XwLr3lsuR_3LE4LvZsQIdocbyDw";

export const usePushNotifications = (user: User | null) => {
  // Safely initialize permission state
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { addToast } = useToast();

  const requestPermission = useCallback(async () => {
    // 1. Check browser support
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        const messaging = await getMessagingInstance();
        if (messaging) {
          try {
            const currentToken = await getToken(messaging, { 
              vapidKey: VAPID_KEY 
            });

            if (currentToken) {
              setFcmToken(currentToken);
              if (user && user.fcmToken !== currentToken) {
                await api.updateUser(user.id, { fcmToken: currentToken });
                console.log("FCM Token updated in user profile");
              }
            } else {
              console.warn('No registration token available. Request permission to generate one.');
            }
          } catch (tokenError) {
            console.error("Error retrieving token:", tokenError);
          }
        }
      }
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && permission === 'granted' && !fcmToken) {
        requestPermission();
    }
  }, [user, permission, fcmToken, requestPermission]);

  // Listener for foreground messages
  useEffect(() => {
    let unsubscribe: any;
    
    const setupListener = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        const messaging = await getMessagingInstance();
        if (messaging) {
            unsubscribe = onMessage(messaging, (payload) => {
                console.log('Message received. ', payload);
                addToast(payload.notification?.title || 'New Message', 'info');
            });
        }
    };

    setupListener();

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [addToast]);

  return { permission, requestPermission };
};
