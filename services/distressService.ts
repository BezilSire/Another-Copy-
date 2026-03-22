import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    serverTimestamp, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    getDoc,
    increment
} from 'firebase/firestore';
import { getDbInstance } from './firebase';
import { DistressCall, User } from '../types';

const getDistressCollection = () => {
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not configured");
    return collection(db, 'distress_calls');
};

export const distressService = {
    sendDistressCall: async (user: User, message: string, location?: { latitude: number; longitude: number }): Promise<string> => {
        if (user.distress_calls_available <= 0) {
            throw new Error('No distress calls available. Please contact support or wait for replenishment.');
        }

        // 1. Create the distress call record
        const docRef = await addDoc(getDistressCollection(), {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            message,
            location: location || null,
            status: 'pending',
            timestamp: serverTimestamp()
        });

        // 2. Decrement the user's available calls
        const userRef = doc(getDistressCollection(), '../users', user.id); // Using collection ref to ensure db is ready
        await updateDoc(userRef, {
            distress_calls_available: increment(-1)
        });

        return docRef.id;
    },

    listenForDistressCalls: (callback: (calls: DistressCall[]) => void) => {
        const q = query(getDistressCollection(), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const calls = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DistressCall));
            callback(calls);
        });
    },

    resolveDistressCall: async (callId: string, status: 'resolved' | 'dismissed'): Promise<void> => {
        const docRef = doc(getDistressCollection(), '../distress_calls', callId);
        await updateDoc(docRef, { status });
    }
};
