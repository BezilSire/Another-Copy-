import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

export const getAdminApp = () => {
    if (adminApp) return adminApp;
    
    let projectId = process.env.VITE_FIREBASE_PROJECT_ID || 
                    process.env.FIREBASE_PROJECT_ID || 
                    process.env.GOOGLE_CLOUD_PROJECT ||
                    process.env.GCP_PROJECT;
    
    // Fallback to config file if available
    try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.projectId && (!projectId || projectId.includes('TODO'))) {
                projectId = config.projectId;
            }
        }
    } catch (e) {}
    
    // If projectId is a placeholder or missing, let it auto-detect from the environment
    if (!projectId || projectId.includes('TODO')) {
        projectId = undefined;
    }
    
    const apps = getApps();
    if (!apps.length) {
        console.log(`Firebase Admin: Initializing... Project ID: ${projectId || 'auto-detect'}`);
        try {
            adminApp = initializeApp({
                projectId: projectId
            });
            console.log("Firebase Admin: Initialization successful.");
        } catch (error) {
            console.error("Firebase Admin: Initialization failed:", error);
            // Fallback to default initialization
            adminApp = initializeApp();
        }
    } else {
        adminApp = getApp();
    }
    return adminApp;
};

export const getAdminAuth = () => {
    if (adminAuth) return adminAuth;
    const app = getAdminApp();
    adminAuth = getAuth(app);
    return adminAuth;
};

export const getAdminDb = () => {
    if (adminDb) return adminDb;
    
    const app = getAdminApp();
    
    // Use the named database if provided
    let databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID;
    
    // Fallback to config file
    try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.firestoreDatabaseId && !databaseId) {
                databaseId = config.firestoreDatabaseId;
            }
        }
    } catch (e) {}
    
    if (databaseId && databaseId !== '(default)') {
        adminDb = getFirestore(app, databaseId);
    } else {
        adminDb = getFirestore(app);
    }
    
    return adminDb;
};
