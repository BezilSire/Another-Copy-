import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

const getEnvVar = (key: string) => {
    try {
        // @ts-ignore - Vite environment
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
            return (import.meta as any).env[key];
        }
    } catch (e) {}
    
    try {
        // Node.js environment
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}
    
    return null;
};

const config = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || firebaseConfig.apiKey,
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || firebaseConfig.authDomain,
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || firebaseConfig.projectId,
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || firebaseConfig.storageBucket,
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseConfig.messagingSenderId,
    appId: getEnvVar('VITE_FIREBASE_APP_ID') || firebaseConfig.appId,
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || firebaseConfig.measurementId,
    databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL') || (firebaseConfig as any).databaseURL,
};

const app = !getApps().length ? initializeApp(config) : getApp();

export const auth = getAuth(app);

// Set persistence as early as possible
if (typeof window !== 'undefined') {
    console.log("Auth: Initializing persistence...");
    setPersistence(auth, browserLocalPersistence).then(() => {
        console.log("Auth: Persistence set to local.");
    }).catch(err => {
        console.error("Auth: Persistence initialization failed:", err);
    });
}

const firestoreId = getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || (firebaseConfig as any).firestoreDatabaseId;

export const db = (firestoreId && firestoreId !== '(default)') 
    ? initializeFirestore(app, { 
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true
      }, firestoreId)
    : initializeFirestore(app, { 
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true
      });

export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

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
      console.debug("Firestore: Persistence initialization skipped.");
    }
  }
};

if (typeof window !== 'undefined') {
  initPersistence();
}

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
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