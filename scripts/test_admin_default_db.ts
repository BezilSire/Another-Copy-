
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function testAdminDefaultDb() {
    console.log("Testing Admin DEFAULT DB connection...");
    try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        const app = initializeApp({
            projectId: config.projectId
        }, 'default-db-test');
        
        const db = getFirestore(app); // No databaseId means default
        
        console.log("Firebase Admin: Initialized (Default DB). Project ID:", config.projectId);
        
        const snap = await db.collection('test').get();
        console.log("Admin DEFAULT DB connection success: Found", snap.size, "documents in 'test'");
    } catch (error) {
        console.error("Admin DEFAULT DB connection failed:", error);
    }
}

testAdminDefaultDb();
