import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    WASocket,
    ConnectionState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import { useFirestoreAuthState } from './whatsappAuthStore';
import { GoogleGenAI } from "@google/genai";

const logger = pino({ level: 'silent' });

interface WhatsAppInstance {
    id: string;
    socket: WASocket;
    qr?: string;
    status: 'connecting' | 'open' | 'close' | 'qr';
    lastUpdate: number;
}

const instances = new Map<string, WhatsAppInstance>();

/**
 * WhatsApp Service to manage multiple agents (Ghosts and Speakers).
 */
export const whatsappService = {
    async createInstance(sessionId: string) {
        if (instances.has(sessionId)) {
            const existing = instances.get(sessionId)!;
            if (existing.status === 'open') return existing;
            // If it's stuck, we'll recreate it
            this.removeInstance(sessionId);
        }

        const { state, saveCreds } = await useFirestoreAuthState(sessionId);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger,
            browser: ['Ubuntium Global Commons', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
        });

        const instance: WhatsAppInstance = {
            id: sessionId,
            socket: sock,
            status: 'connecting',
            lastUpdate: Date.now(),
        };
        instances.set(sessionId, instance);

        sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
            const { connection, lastDisconnect, qr } = update;
            instance.lastUpdate = Date.now();

            if (qr) {
                instance.status = 'qr';
                instance.qr = await QRCode.toDataURL(qr);
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                instance.status = 'close';
                console.log(`WhatsApp connection closed for ${sessionId}. Reconnecting: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    this.createInstance(sessionId);
                } else {
                    this.removeInstance(sessionId);
                }
            } else if (connection === 'open') {
                instance.status = 'open';
                instance.qr = undefined;
                console.log(`WhatsApp connection opened for ${sessionId}`);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe && msg.message) {
                        await this.handleIncomingMessage(sessionId, msg);
                    }
                }
            }
        });

        return instance;
    },

    async handleIncomingMessage(sessionId: string, msg: any) {
        const text = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption;

        if (!text) return;

        const sender = msg.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        
        console.log(`[WA-${sessionId}] Message from ${sender}: ${text.substring(0, 50)}...`);

        // Notify subscribers (like the server-side chat brain)
        if (this._onMessageCallback) {
            await this._onMessageCallback(sessionId, msg);
        }

        // AI Parsing Logic for Zim Pulse
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Extract commerce data from this WhatsApp message. 
                If it's an offer, need, or job, return JSON. 
                If it's noise, return { "isNoise": true }.
                
                Message: "${text}"
                
                Format: {
                    "isNoise": boolean,
                    "type": "offer" | "need" | "job",
                    "item": string,
                    "price": string,
                    "location": string,
                    "contact": string,
                    "description": string
                }`,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const result = JSON.parse(response.text || '{}');
            if (result.isNoise) return;

            console.log(`[WA-${sessionId}] Extracted Commerce Event:`, result);
            
            // Save to Firestore (Zim Pulse)
            const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
            const { getDbInstance } = await import('./firebase');
            const db = getDbInstance();
            
            if (db) {
                await addDoc(collection(db, 'zim_pulse'), {
                    ...result,
                    source: isGroup ? 'group' : 'direct',
                    sessionId,
                    sender,
                    timestamp: serverTimestamp()
                });
            } else {
                console.warn(`[WA-${sessionId}] Firestore not configured, Zim Pulse event not saved.`);
            }

        } catch (error) {
            console.error(`[WA-${sessionId}] AI Parsing failed:`, error);
        }
    },

    getInstance(sessionId: string) {
        return instances.get(sessionId);
    },

    listInstances() {
        return Array.from(instances.values()).map(i => ({
            id: i.id,
            status: i.status,
            qr: i.qr,
            lastUpdate: i.lastUpdate
        }));
    },

    removeInstance(sessionId: string) {
        const instance = instances.get(sessionId);
        if (instance) {
            try {
                instance.socket.logout();
                instance.socket.end(undefined);
            } catch (e) {}
            instances.delete(sessionId);
        }
    },

    _onMessageCallback: null as (((sessionId: string, msg: any) => Promise<void>) | null),

    onMessage(callback: (sessionId: string, msg: any) => Promise<void>) {
        this._onMessageCallback = callback;
    },

    async sendMessage(sessionId: string, to: string, text: string) {
        const instance = instances.get(sessionId);
        if (instance && instance.status === 'open') {
            await instance.socket.sendMessage(to, { text });
        } else {
            console.error(`Cannot send message: Instance ${sessionId} is not open.`);
        }
    },

    async init(sessionId: string) {
        return this.createInstance(sessionId);
    },

    async recoverSessions() {
        try {
            const { getDocs, collection } = await import('firebase/firestore');
            const { getDbInstance } = await import('./firebase');
            const db = getDbInstance();
            if (!db) {
                console.warn('WhatsApp: Firestore not configured, session recovery skipped.');
                return;
            }
            const querySnapshot = await getDocs(collection(db, 'whatsapp_auth'));
            const sessionIds = querySnapshot.docs.map(doc => doc.id);
            
            console.log(`Recovering ${sessionIds.length} WhatsApp sessions from Firestore...`);
            for (const sessionId of sessionIds) {
                this.createInstance(sessionId).catch(err => 
                    console.error(`Failed to recover session ${sessionId}:`, err)
                );
            }
        } catch (error) {
            console.error('Failed to recover WhatsApp sessions:', error);
        }
    }
};
