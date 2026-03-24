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
import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";

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
    async createInstance(sessionId: string, forceReset: boolean = false) {
        if (instances.has(sessionId)) {
            const existing = instances.get(sessionId)!;
            if (existing.status === 'open' && !forceReset) return existing;
            // If it's stuck or we want to reset, we'll recreate it
            this.removeInstance(sessionId);
        }

        if (forceReset) {
            console.log(`WhatsApp [${sessionId}]: Force resetting session data...`);
            try {
                console.log(`WhatsApp [${sessionId}]: Clearing session data via Client SDK...`);
                const { db: clientDb } = await import('./firebase');
                const { doc, collection, getDocs, writeBatch } = await import('firebase/firestore');
                
                if (clientDb) {
                    const sessionDocRef = doc(clientDb, 'whatsapp_sessions', sessionId);
                    const keysColRef = collection(sessionDocRef, 'keys');
                    
                    console.log(`WhatsApp [${sessionId}]: Fetching keys...`);
                    const keysSnap = await getDocs(keysColRef);
                    console.log(`WhatsApp [${sessionId}]: Found ${keysSnap.size} keys to clear.`);
                    
                    const batch = writeBatch(clientDb);
                    keysSnap.forEach(d => batch.delete(d.ref));
                    batch.delete(sessionDocRef);
                    await batch.commit();
                    console.log(`WhatsApp [${sessionId}]: Session data cleared successfully.`);
                } else {
                    console.warn(`WhatsApp [${sessionId}]: Client DB not available for clearing session.`);
                }
            } catch (err) {
                console.error(`WhatsApp [${sessionId}]: Failed to clear session data:`, err);
            }
        }

        const { state, saveCreds } = await useFirestoreAuthState(sessionId);
        console.log(`WhatsApp [${sessionId}]: Auth state loaded. Initialized: ${!!state.creds.me}`);

        let version: any;
        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
            console.log(`WhatsApp [${sessionId}]: Using Baileys version ${version.join('.')}`);
        } catch (err) {
            console.warn(`WhatsApp [${sessionId}]: Failed to fetch latest Baileys version, using default. Error:`, err);
            version = [2, 3000, 1015901307]; // Fallback version
        }

        const sock = makeWASocket({
            version,
            printQRInTerminal: true, // Log QR in terminal for debugging
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger: logger as any,
            browser: ['Ubuntium Global Commons', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        const instance: WhatsAppInstance = {
            id: sessionId,
            socket: sock,
            status: 'connecting',
            lastUpdate: Date.now(),
        };
        instances.set(sessionId, instance);

        // Connection Timeout to detect stuck connections
        const connectionTimeout = setTimeout(() => {
            if (instance.status === 'connecting') {
                console.warn(`WhatsApp [${sessionId}]: Connection is taking too long (60s). Status: ${instance.status}`);
            }
        }, 60000);

        sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
            const { connection, lastDisconnect, qr } = update;
            instance.lastUpdate = Date.now();

            console.log(`WhatsApp [${sessionId}]: Connection update:`, { connection, qr: !!qr, status: instance.status });

            if (qr) {
                console.log(`WhatsApp [${sessionId}]: New QR received. Length: ${qr.length}`);
                instance.status = 'qr';
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr);
                    instance.qr = qrDataUrl;
                    console.log(`WhatsApp [${sessionId}]: QR Data URL generated successfully.`);
                } catch (err) {
                    console.error(`WhatsApp [${sessionId}]: Failed to generate QR Data URL:`, err);
                }
            }

            if (connection === 'close') {
                clearTimeout(connectionTimeout);
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                instance.status = 'close';
                console.log(`WhatsApp [${sessionId}]: Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    console.log(`WhatsApp [${sessionId}]: Reconnecting in 5 seconds...`);
                    setTimeout(() => this.createInstance(sessionId), 5000);
                } else {
                    console.log(`WhatsApp [${sessionId}]: Logged out, removing instance.`);
                    this.removeInstance(sessionId);
                }
            } else if (connection === 'open') {
                clearTimeout(connectionTimeout);
                instance.status = 'open';
                instance.qr = undefined;
                console.log(`WhatsApp [${sessionId}]: Connection opened successfully. Node is online.`);
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
            const apiKey = process.env.OPENROUTER_API_KEY;
            let result = null;

            if (apiKey) {
                const prompt = `Extract commerce data from this WhatsApp message. 
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
                }`;

                const models = [
                    "openrouter/auto", 
                    "qwen/qwen-2.5-72b-instruct", 
                    "google/gemini-2.0-flash-001"
                ];
                for (const model of models) {
                    try {
                        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                            model,
                            messages: [{ role: "user", content: prompt }],
                            response_format: { type: "json_object" }
                        }, {
                            headers: {
                                "Authorization": `Bearer ${apiKey}`,
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://ubuntium.org",
                                "X-Title": "Ubuntium Global Commons",
                            },
                            timeout: 10000 // 10s timeout
                        });

                        if (response.status === 200) {
                            const data = response.data;
                            const content = data.choices?.[0]?.message?.content;
                            if (content) {
                                try {
                                    result = JSON.parse(content);
                                    break;
                                } catch (parseError) {
                                    console.error(`OpenRouter Parsing Error (${model}): Failed to parse JSON:`, content);
                                }
                            }
                        }
                    } catch (e: any) {
                        console.error(`OpenRouter Parsing Error (${model}):`, e.message || e);
                    }
                }
            }

            // NVIDIA Fallback if OpenRouter fails
            if (!result) {
                const nvidiaKey = process.env.NVIDIA_API_KEY;
                if (nvidiaKey) {
                    try {
                        console.log(`[WA-${sessionId}] Falling back to NVIDIA for parsing...`);
                        const response = await axios.post("https://integrate.api.nvidia.com/v1/chat/completions", {
                            model: "moonshotai/kimi-k2.5",
                            messages: [{ role: "user", content: prompt }],
                            response_format: { type: "json_object" }
                        }, {
                            headers: {
                                "Authorization": `Bearer ${nvidiaKey}`,
                                "Content-Type": "application/json",
                            },
                            timeout: 12000 // 12s timeout
                        });

                        if (response.status === 200) {
                            const data = response.data;
                            const content = data.choices?.[0]?.message?.content;
                            if (content) {
                                try {
                                    result = JSON.parse(content);
                                } catch (parseError) {
                                    console.error(`[WA-${sessionId}] NVIDIA Parsing Error: Failed to parse JSON:`, content);
                                }
                            }
                        }
                    } catch (e: any) {
                        console.error(`[WA-${sessionId}] NVIDIA Parsing Error:`, e.message || e);
                    }
                }
            }

            // Fallback to Gemini if OpenRouter and NVIDIA fail or are not configured
            if (!result) {
                const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
                const ai = new GoogleGenAI({ apiKey: geminiKey || '' });
                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: `Extract commerce data from this WhatsApp message. 
                    If it's an offer, need, or job, return JSON. 
                    If it's noise, return { "isNoise": true }.
                    
                    Message: "${text}"`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                isNoise: { type: Type.BOOLEAN },
                                type: { type: Type.STRING, enum: ["offer", "need", "job"] },
                                item: { type: Type.STRING },
                                price: { type: Type.STRING },
                                location: { type: Type.STRING },
                                contact: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ["isNoise"]
                        }
                    }
                });
                try {
                    result = JSON.parse(response.text || '{}');
                } catch (parseError) {
                    console.error(`[WA-${sessionId}] Gemini Parsing Error: Failed to parse JSON:`, response.text);
                    result = { isNoise: true };
                }
            }

            if (!result || result.isNoise) return;

            console.log(`[WA-${sessionId}] Extracted Commerce Event:`, result);
            
            // Save to Firestore (Zim Pulse)
            const { db } = await import('./firebase');
            
            if (db) {
                const { collection, addDoc } = await import('firebase/firestore');
                await addDoc(collection(db, 'zim_pulse'), {
                    ...result,
                    source: isGroup ? 'group' : 'direct',
                    sessionId,
                    sender,
                    timestamp: new Date()
                });
            } else {
                console.warn(`[WA-${sessionId}] Firestore Client SDK not configured, Zim Pulse event not saved.`);
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

    async init(sessionId: string, forceReset: boolean = false) {
        return this.createInstance(sessionId, forceReset);
    },

    async recoverSessions() {
        try {
            const { db } = await import('./firebase');
            if (!db) {
                console.warn('WhatsApp: Firestore Client SDK not configured, session recovery skipped.');
                return;
            }
            const { collection, getDocs } = await import('firebase/firestore');
            const querySnapshot = await getDocs(collection(db, 'whatsapp_sessions'));
            const sessionIds = querySnapshot?.docs?.map((doc: any) => doc.id) || [];
            
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
