import { 
    AuthenticationState, 
    AuthenticationCreds, 
    SignalDataTypeMap, 
    initAuthCreds, 
    BufferJSON, 
    proto 
} from '@whiskeysockets/baileys';
import { 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    collection, 
    getDocs, 
    query, 
    where,
    writeBatch
} from 'firebase/firestore';
import { getDbInstance } from './firebase';

/**
 * Custom Firestore-backed authentication state for Baileys.
 * This ensures WhatsApp sessions persist across server restarts in containerized environments.
 */
export const useFirestoreAuthState = async (sessionId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const db = getDbInstance();
    if (!db) {
        throw new Error("Firestore is not configured. Cannot use FirestoreAuthState.");
    }
    const sessionDoc = doc(db, 'whatsapp_sessions', sessionId);
    const keysCol = collection(sessionDoc, 'keys');

    const writeData = async (data: any, id: string) => {
        const json = JSON.stringify(data, BufferJSON.replacer);
        await setDoc(doc(keysCol, id), { data: json });
    };

    const readData = async (id: string) => {
        try {
            const d = await getDoc(doc(keysCol, id));
            if (d.exists()) {
                return JSON.parse(d.data().data, BufferJSON.reviver);
            }
        } catch (error) {
            console.error(`Error reading key ${id} from Firestore:`, error);
        }
        return null;
    };

    const removeData = async (id: string) => {
        try {
            await deleteDoc(doc(keysCol, id));
        } catch (error) {
            console.error(`Error deleting key ${id} from Firestore:`, error);
        }
    };

    // Load initial creds
    const credsDoc = await getDoc(sessionDoc);
    let creds: AuthenticationCreds;
    if (credsDoc.exists() && credsDoc.data().creds) {
        creds = JSON.parse(credsDoc.data().creds, BufferJSON.reviver);
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
            await setDoc(sessionDoc, { 
                creds: JSON.stringify(creds, BufferJSON.replacer),
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }
    };
};
