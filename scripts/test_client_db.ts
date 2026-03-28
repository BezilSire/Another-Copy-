
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function testClientDb() {
    console.log("Testing Client DB connection...");
    try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        const app = initializeApp(config);
        const db = getFirestore(app, config.firestoreDatabaseId);
        
        console.log("Client DB: Initialized. Project ID:", config.projectId);
        
        const snap = await getDocs(collection(db, 'test'));
        console.log("Client DB connection success: Found", snap.size, "documents in 'test'");
    } catch (error) {
        console.error("Client DB connection failed:", error);
    }
}

testClientDb();
