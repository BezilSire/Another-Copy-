import { 
    AuthenticationState, 
    AuthenticationCreds, 
    SignalDataTypeMap, 
    initAuthCreds, 
    BufferJSON, 
    proto 
} from '@whiskeysockets/baileys';
import { getAdminDb } from './firebaseAdmin';

/**
 * Custom Firestore-backed authentication state for Baileys using Firebase Admin SDK.
 * This ensures WhatsApp sessions persist across server restarts and bypasses security rules.
 */
export const useFirestoreAuthState = async (sessionId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const db = await getAdminDb();
    if (!db) {
        throw new Error("Firestore Admin SDK is not configured. Cannot use FirestoreAuthState.");
    }
    
    const sessionDoc = db.collection('whatsapp_sessions').doc(sessionId);
    const keysCol = sessionDoc.collection('keys');

    const writeData = async (data: any, id: string) => {
        const json = JSON.stringify(data, BufferJSON.replacer);
        await keysCol.doc(id).set({ data: json });
    };

    const readData = async (id: string) => {
        try {
            const d = await keysCol.doc(id).get();
            if (d.exists) {
                return JSON.parse(d.data()!.data, BufferJSON.reviver);
            }
        } catch (error) {
            console.error(`Error reading key ${id} from Firestore:`, error);
        }
        return null;
    };

    const removeData = async (id: string) => {
        try {
            await keysCol.doc(id).delete();
        } catch (error) {
            console.error(`Error deleting key ${id} from Firestore:`, error);
        }
    };

    // Load initial creds
    const credsDoc = await sessionDoc.get();
    let creds: AuthenticationCreds;
    if (credsDoc.exists && credsDoc.data()?.creds) {
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
            await sessionDoc.set({ 
                creds: JSON.stringify(creds, BufferJSON.replacer),
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }
    };
};
