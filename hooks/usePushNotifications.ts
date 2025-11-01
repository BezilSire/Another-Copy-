import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../services/firebase';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { User } from '../types';

// IMPORTANT: You must generate a VAPID key in your Firebase project console and paste it here.
// Go to: Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates
const VAPID_KEY = 'YOUR_FIREBASE_MESSAGING_VAPID_KEY';

export const usePushNotifications = (user: User | null) => {
  const { addToast } = useToast();

  useEffect(() => {
    if (!user || VAPID_KEY === 'YOUR_FIREBASE_MESSAGING_VAPID_KEY') {
      if (VAPID_KEY === 'YOUR_FIREBASE_MESSAGING_VAPID_KEY') {
        console.warn("Push notifications are disabled. Please configure a VAPID key in 'hooks/usePushNotifications.ts'");
      }
      return;
    }
    
    let unsubscribeOnMessage: (() => void) | undefined;

    const initializeNotifications = async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.warn('Firebase Messaging is not supported in this browser.');
        return;
      }

      try {
        // Wait for the service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');

          // Get token, passing in the service worker registration
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

          if (currentToken) {
            // Save the token to Firestore if it's new
            if (!user.fcmTokens?.includes(currentToken)) {
              await api.saveFcmToken(user.id, currentToken);
              console.log('FCM Token saved to user profile.');
            }
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Unable to get permission to notify.');
        }

        unsubscribeOnMessage = onMessage(messaging, (payload) => {
          console.log('Message received in foreground. ', payload);
          const notificationTitle = payload.notification?.title || 'New Message';
          const notificationBody = payload.notification?.body || '';
          
          addToast(`${notificationTitle}: ${notificationBody}`, 'info');
        });

      } catch (err) {
        console.error('An error occurred during notification setup. ', err);
        addToast('Could not set up notifications.', 'error');
      }
    };

    initializeNotifications();

    return () => {
      if (unsubscribeOnMessage) {
        unsubscribeOnMessage();
      }
    };
  }, [user, addToast]);
};
