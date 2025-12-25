import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
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

// Initialize persistence once with error handling for multi-tab environments
const initPersistence = async () => {
  try {
    await enableMultiTabIndexedDbPersistence(db);
    console.log("Firestore: Persistence enabled.");
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore: Multiple tabs open, persistence limited to primary tab.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore: Browser does not support persistence.');
    } else {
      console.debug("Firestore: Persistence initialization skipped (already active).");
    }
  }
};

initPersistence();

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