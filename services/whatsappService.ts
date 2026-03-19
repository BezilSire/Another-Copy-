
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    WAMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_PATH = path.join(process.cwd(), 'wa_auth');

export class WhatsAppService {
    private sessions: Map<string, any> = new Map();
    private qrs: Map<string, string | null> = new Map();
    private statuses: Map<string, 'disconnected' | 'connecting' | 'qr' | 'ready'> = new Map();
    private logger = pino({ level: 'silent' });
    private onMessageCallback: ((userId: string, msg: WAMessage) => void) | null = null;

    constructor() {
        if (!fs.existsSync(AUTH_PATH)) {
            fs.mkdirSync(AUTH_PATH, { recursive: true });
        }
    }

    async init(userId: string) {
        if (this.sessions.has(userId)) return;

        const userAuthPath = path.join(AUTH_PATH, userId);
        if (!fs.existsSync(userAuthPath)) {
            fs.mkdirSync(userAuthPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(userAuthPath);
        const { version } = await fetchLatestBaileysVersion();

        this.statuses.set(userId, 'connecting');

        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger),
            },
            logger: this.logger,
            browser: ["Ubuntium Agent", "Chrome", "1.0.0"]
        });

        this.sessions.set(userId, sock);

        sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                const qrData = await QRCode.toDataURL(qr);
                this.qrs.set(userId, qrData);
                this.statuses.set(userId, 'qr');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                this.statuses.set(userId, 'disconnected');
                this.qrs.set(userId, null);
                this.sessions.delete(userId);
                if (shouldReconnect) {
                    this.init(userId);
                }
            } else if (connection === 'open') {
                this.statuses.set(userId, 'ready');
                this.qrs.set(userId, null);
                console.log(`WhatsApp: Connection opened for user ${userId}`);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe && this.onMessageCallback) {
                        this.onMessageCallback(userId, msg);
                    }
                }
            }
        });
    }

    getStatus(userId: string) {
        return {
            status: this.statuses.get(userId) || 'disconnected',
            qr: this.qrs.get(userId) || null
        };
    }

    async sendMessage(userId: string, to: string, text: string) {
        const sock = this.sessions.get(userId);
        if (!sock || this.statuses.get(userId) !== 'ready') {
            throw new Error('WhatsApp not ready for this user');
        }
        await sock.sendMessage(to, { text });
    }

    onMessage(callback: (userId: string, msg: WAMessage) => void) {
        this.onMessageCallback = callback;
    }

    async logout(userId: string) {
        const sock = this.sessions.get(userId);
        if (sock) {
            await sock.logout();
            this.sessions.delete(userId);
            this.statuses.set(userId, 'disconnected');
            this.qrs.set(userId, null);
            
            const userAuthPath = path.join(AUTH_PATH, userId);
            if (fs.existsSync(userAuthPath)) {
                fs.rmSync(userAuthPath, { recursive: true, force: true });
            }
        }
    }
}

export const whatsappService = new WhatsAppService();
