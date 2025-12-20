
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from './firebaseConfig';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

// Safer persistence initialization to prevent "Unexpected state" assertions
let persistenceInitialized = false;

export const initFirestorePersistence = async () => {
    if (persistenceInitialized) return;
    persistenceInitialized = true;
    
    try {
        // Try multi-tab persistence first
        await enableMultiTabIndexedDbPersistence(db);
        console.log("Firestore: Multi-tab persistence enabled.");
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore: Multiple tabs open, using fallback persistence.');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore: Browser does not support persistence.');
        } else {
            console.debug("Firestore: Persistence already active or failed:", err.code);
        }
    }
};

// Fire immediately but don't block exports
initFirestorePersistence();

export const getMessagingInstance = async () => {
  try {
    const isMessagingSupported = await isSupported();
    if (isMessagingSupported) {
      return getMessaging(app);
    }
    return null;
  } catch (error) {
    console.error("Error checking for messaging support:", error);
    return null;
  }
};
