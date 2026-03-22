import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let adminDb: admin.firestore.Firestore | null = null;

export const getAdminDb = () => {
    if (adminDb) return adminDb;
    
    if (!adminApp) {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        
        if (!admin.apps.length) {
            adminApp = admin.initializeApp({
                projectId: projectId
            });
        } else {
            adminApp = admin.app();
        }
    }
    
    adminDb = adminApp.firestore();
    // Use the named database if provided
    const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID;
    if (databaseId && databaseId !== '(default)') {
        // Note: In admin SDK, you might need to handle multiple databases differently 
        // but for now we assume the default app is connected to the right project.
    }
    
    return adminDb;
};
