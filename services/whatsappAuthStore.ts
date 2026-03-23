import { 
    AuthenticationState, 
    AuthenticationCreds, 
    SignalDataTypeMap, 
    initAuthCreds, 
    BufferJSON, 
    proto 
} from '@whiskeysockets/baileys';

/**
 * Custom Firestore-backed authentication state for Baileys using Firebase Admin SDK.
 * This ensures WhatsApp sessions persist across server restarts and bypasses security rules.
 */
export const useFirestoreAuthState = async (sessionId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const { db } = await import('./firebase');
    if (!db) {
        throw new Error("Firestore Client SDK is not configured. Cannot use FirestoreAuthState.");
    }
    
    const { doc, collection, getDoc, setDoc, deleteDoc, getDocs } = await import('firebase/firestore');
    
    const sessionDocRef = doc(db, 'whatsapp_sessions', sessionId);
    const keysColRef = collection(sessionDocRef, 'keys');

    const writeData = async (data: any, id: string) => {
        const json = JSON.stringify(data, BufferJSON.replacer);
        try {
            const docRef = doc(db, 'whatsapp_sessions', sessionId, 'keys', id);
            await setDoc(docRef, { data: json });
        } catch (error) {
            console.error(`WhatsApp [${sessionId}]: Error writing key ${id} to Firestore:`, error);
        }
    };

    const readData = async (id: string) => {
        try {
            const docRef = doc(db, 'whatsapp_sessions', sessionId, 'keys', id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return JSON.parse(snap.data()!.data, BufferJSON.reviver);
            }
        } catch (error) {
            console.error(`WhatsApp [${sessionId}]: Error reading key ${id} from Firestore:`, error);
        }
        return null;
    };

    const removeData = async (id: string) => {
        try {
            const docRef = doc(db, 'whatsapp_sessions', sessionId, 'keys', id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(`WhatsApp [${sessionId}]: Error deleting key ${id} from Firestore:`, error);
        }
    };

    // Load initial creds
    const credsDoc = await getDoc(sessionDocRef);
    let creds: AuthenticationCreds;
    if (credsDoc.exists() && credsDoc.data()?.creds) {
        creds = JSON.parse(credsDoc.data()!.creds, BufferJSON.reviver);
    } else {
        creds = initAuthCreds();
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: { [id: string]: any } = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category as keyof SignalDataTypeMap]) {
                            const value = data[category as keyof SignalDataTypeMap]![id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            const data = { 
                creds: JSON.stringify(creds, BufferJSON.replacer),
                updatedAt: new Date().toISOString()
            };
            try {
                await setDoc(sessionDocRef, data, { merge: true });
            } catch (error) {
                console.error(`WhatsApp [${sessionId}]: Error saving creds to Firestore:`, error);
            }
        }
    };
};
