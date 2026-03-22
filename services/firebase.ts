import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';

// Safely attempt to load the local config file if it exists
let firebaseConfig: any = null;
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

const getFirebaseConfig = () => {
    if (firebaseConfig !== null) return firebaseConfig;
    
    firebaseConfig = {};
    if (isNode) {
        try {
            // In Node, we can use require if we are in CJS, but we are in ESM.
            // We'll try to use sync fs if possible, but since we are in ESM, 
            // we can't easily use require('fs').
            // However, we can use process.env mostly.
        } catch (e) {}
    } else {
        try {
            // In Vite environment (client-side)
            // @ts-ignore
            const localConfigs = import.meta.glob('../firebase-applet-config.json', { eager: true });
            firebaseConfig = (localConfigs['../firebase-applet-config.json'] as any)?.default || {};
        } catch (e) {}
    }
    return firebaseConfig;
};

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

const getConfig = () => {
    const fbConfig = getFirebaseConfig();
    return {
        apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || fbConfig.apiKey,
        authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || fbConfig.authDomain,
        projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || fbConfig.projectId,
        storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || fbConfig.storageBucket,
        messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || fbConfig.messagingSenderId,
        appId: getEnvVar('VITE_FIREBASE_APP_ID') || fbConfig.appId,
        measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || fbConfig.measurementId,
        databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL') || fbConfig.databaseURL,
    };
};

// Lazy initialization to prevent crashes if config is missing during server startup
let appInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let rtdbInstance: any = null;
let storageInstance: any = null;
let functionsInstance: any = null;

const getFirebaseApp = () => {
    if (!appInstance) {
        const config = getConfig();
        if (!config.apiKey) {
            console.warn("Firebase: No 'apiKey' provided in config. Firebase services will be unavailable.");
            appInstance = { isMock: true };
            return appInstance;
        }
        try {
            appInstance = !getApps().length ? initializeApp(config) : getApp();
        } catch (e) {
            appInstance = getApp();
        }
    }
    return appInstance;
};

// Helper to check if Firebase is properly configured
export const isFirebaseConfigured = () => {
    return !!getConfig().apiKey;
};

// Export getters instead of constants to ensure lazy initialization and caching
export const getAuthInstance = () => {
    if (authInstance) return authInstance;
    const app = getFirebaseApp();
    if (app.isMock) return null;
    authInstance = getAuth(app);
    return authInstance;
};

export const getDbInstance = () => {
    if (dbInstance) return dbInstance;
    const app = getFirebaseApp();
    if (app.isMock) return null;
    
    const firestoreId = getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || (getFirebaseConfig() as any).firestoreDatabaseId;
    
    try {
        dbInstance = (firestoreId && firestoreId !== '(default)') 
            ? initializeFirestore(app, { 
                ignoreUndefinedProperties: true,
                experimentalAutoDetectLongPolling: true,
                experimentalForceLongPolling: true
              }, firestoreId)
            : initializeFirestore(app, { 
                ignoreUndefinedProperties: true,
                experimentalAutoDetectLongPolling: true,
                experimentalForceLongPolling: true
              });
    } catch (e) {
        // If already initialized, we should use getFirestore if possible
        console.debug("Firestore: Already initialized or failed to initialize with custom settings. Falling back to getFirestore.");
        dbInstance = (firestoreId && firestoreId !== '(default)') ? getFirestore(app, firestoreId) : getFirestore(app);
    }
    return dbInstance;
};

export const getRtdbInstance = () => {
    if (rtdbInstance) return rtdbInstance;
    const app = getFirebaseApp();
    if (app.isMock) return null;
    rtdbInstance = getDatabase(app);
    return rtdbInstance;
};

export const getStorageInstance = () => {
    if (storageInstance) return storageInstance;
    const app = getFirebaseApp();
    if (app.isMock) return null;
    storageInstance = getStorage(app);
    return storageInstance;
};

export const getFunctionsInstance = () => {
    if (functionsInstance) return functionsInstance;
    const app = getFirebaseApp();
    if (app.isMock) return null;
    functionsInstance = getFunctions(app);
    return functionsInstance;
};

// For backward compatibility in client-side code
export const auth = getAuthInstance();
export const db = getDbInstance();
export const rtdb = getRtdbInstance();
export const storage = getStorageInstance();
export const functions = getFunctionsInstance();

const initPersistence = async () => {
  if (!db) return;
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
      return getMessaging(getFirebaseApp());
    }
    return null;
  } catch (error) {
    console.error("Error checking for messaging support:", error);
    return null;
  }
};