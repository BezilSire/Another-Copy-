import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminAppInstance, App as AdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuthInstance, Auth as AdminAuth } from 'firebase-admin/auth';
import { getDbInstance } from './firebase.js'; 
import * as fs from 'fs';
import * as path from 'path';

let adminApp: AdminApp | null = null;
let adminDb: any = null;
let adminAuth: AdminAuth | null = null;

const getConfig = () => {
    try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {}
    return {};
};

export const getAdminApp = () => {
    if (adminApp) return adminApp;
    
    const config = getConfig();
    let projectId = process.env.FIREBASE_PROJECT_ID || 
                    process.env.VITE_FIREBASE_PROJECT_ID || 
                    config.projectId;
    
    if (!projectId || projectId.includes('TODO')) {
        projectId = undefined;
    }
    
    const apps = getAdminApps();
    if (!apps.length) {
        try {
            adminApp = initializeAdminApp({
                projectId: projectId
            });
        } catch (error) {
            console.error("Admin: Failed to initialize with projectId, trying default:", error);
            adminApp = initializeAdminApp();
        }
    } else {
        adminApp = getAdminAppInstance();
    }
    return adminApp;
};

export const getAdminAuth = () => {
    if (adminAuth) return adminAuth;
    const app = getAdminApp();
    adminAuth = getAdminAuthInstance(app);
    return adminAuth;
};

/**
 * Returns a Firestore instance.
 * We use the Admin SDK Firestore to bypass security rules on the server.
 */
export const getAdminDb = () => {
    if (adminDb) return adminDb;
    const app = getAdminApp();
    const config = getConfig();
    const databaseId = config.firestoreDatabaseId || '(default)';
    
    try {
        adminDb = getAdminFirestore(app, databaseId);
        console.log(`Admin: Firestore initialized for database: ${databaseId}`);
    } catch (error) {
        console.error("Admin: Failed to initialize Firestore with databaseId, trying default:", error);
        adminDb = getAdminFirestore(app);
    }
    return adminDb;
};
