
import { getAdminAuth } from '../services/firebaseAdmin.js';

async function testAdminAuth() {
    console.log("Testing Admin Auth...");
    try {
        const auth = getAdminAuth();
        const user = await auth.createUser({
            email: 'test-admin@example.com',
            password: 'password123'
        });
        console.log("Admin Auth success: Created user", user.uid);
        await auth.deleteUser(user.uid);
        console.log("Admin Auth success: Deleted user");
    } catch (error) {
        console.error("Admin Auth failed:", error);
    }
}

testAdminAuth();
