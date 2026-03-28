
import { getAdminDb } from '../services/firebaseAdmin.js';

async function testAdminDb() {
    try {
        const db = getAdminDb();
        console.log("Testing Admin DB connection...");
        const collections = await db.listCollections();
        console.log("Found collections:", collections.map((c: any) => c.id));
        console.log("Admin DB connection successful.");
    } catch (error) {
        console.error("Admin DB connection failed:", error);
    }
}

testAdminDb();
