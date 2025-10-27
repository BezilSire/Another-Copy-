import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

// A robust way to initialize Firebase that prevents re-initialization errors.
// It checks if an app is already initialized before creating a new one.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Explicitly enable Firestore persistence with multi-tab support to improve stability
// and prevent crashes related to IndexedDB connection loss, especially when multiple tabs are open.
enableMultiTabIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // This can happen if multiple tabs are open, and one tab is acting as the primary.
      // This is not a critical error, so we'll just log a warning.
      console.warn(
        'Firestore persistence failed to enable. This is likely because the app is open in another tab. Offline functionality may be limited.'
      );
    } else if (err.code === 'unimplemented') {
      // The browser does not support all features required for persistence.
      console.warn(
        'This browser does not support Firestore offline persistence. The app will work online only.'
      );
    } else {
      // Log other potential persistence errors.
      console.error("An unexpected error occurred while enabling Firestore persistence:", err);
    }
  });