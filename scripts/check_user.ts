
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function checkUser() {
    const apps = getApps();
    const app = !apps.length ? initializeApp() : getApp();
    const db = getFirestore(app);
    
    const email = 'bezilsire00@gmail.com';
    try {
        const usersSnap = await db.collection('users').where('email', '==', email).get();
        if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            console.log(`User found in Firestore: ${userDoc.id}`);
            console.log(`Data: ${JSON.stringify(userDoc.data(), null, 2)}`);
        } else {
            console.log(`User NOT found in Firestore with email: ${email}`);
        }
    } catch (e: any) {
        console.error(`Error checking user: ${e.message}`);
    }
}

checkUser().catch(console.error);
