
import * as tweetnacl from 'tweetnacl';

const nacl = (tweetnacl as any).default || tweetnacl;

const SIGN_SECRET_KEY_STORAGE = 'gcn_sign_secret_key';
const SIGN_PUBLIC_KEY_STORAGE = 'gcn_sign_public_key';

interface KeyPair {
    publicKey: string;
    secretKey: string;
}

const encodeUTF8 = (s: string): Uint8Array => new TextEncoder().encode(s);
const decodeUTF8 = (arr: Uint8Array): string => new TextDecoder().decode(arr);

const encodeBase64 = (arr: Uint8Array): string => {
    let binary = '';
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(arr[i]);
    }
    return window.btoa(binary);
};

const decodeBase64 = (s: string): Uint8Array => {
    try {
        const cleanString = s.replace(/\s/g, '');
        const binary_string = window.atob(cleanString);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        return new Uint8Array(0);
    }
};

export const cryptoService = {
    getOrGenerateSigningKeys: (): KeyPair => {
        const storedSecret = localStorage.getItem(SIGN_SECRET_KEY_STORAGE);
        const storedPublic = localStorage.getItem(SIGN_PUBLIC_KEY_STORAGE);

        if (storedSecret && storedPublic) {
            return { publicKey: storedPublic, secretKey: storedSecret };
        }

        if (!nacl || !nacl.sign) {
            throw new Error("Crypto library initialization failed.");
        }

        const keys = nacl.sign.keyPair();
        const publicKeyBase64 = encodeBase64(keys.publicKey);
        const secretKeyBase64 = encodeBase64(keys.secretKey);

        localStorage.setItem(SIGN_PUBLIC_KEY_STORAGE, publicKeyBase64);
        localStorage.setItem(SIGN_SECRET_KEY_STORAGE, secretKeyBase64);

        return { publicKey: publicKeyBase64, secretKey: secretKeyBase64 };
    },

    getPublicKey: (): string | null => {
        const stored = localStorage.getItem(SIGN_PUBLIC_KEY_STORAGE);
        if (stored) return stored;
        try {
            return cryptoService.getOrGenerateSigningKeys().publicKey;
        } catch (e) {
            return null;
        }
    },

    importSecretKey: (secretKeyBase64: string): KeyPair => {
        const secretKey = decodeBase64(secretKeyBase64);
        const keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
        const publicKeyBase64 = encodeBase64(keyPair.publicKey);
        
        localStorage.setItem(SIGN_PUBLIC_KEY_STORAGE, publicKeyBase64);
        localStorage.setItem(SIGN_SECRET_KEY_STORAGE, secretKeyBase64);
        
        return { publicKey: publicKeyBase64, secretKey: secretKeyBase64 };
    },

    signTransaction: (payload: string): string => {
        const keys = cryptoService.getOrGenerateSigningKeys();
        const secretKey = decodeBase64(keys.secretKey);
        const messageUint8 = encodeUTF8(payload);
        const signature = nacl.sign.detached(messageUint8, secretKey);
        return encodeBase64(signature);
    },

    generateNonce: (): string => {
        const array = new Uint8Array(12);
        window.crypto.getRandomValues(array);
        return encodeBase64(array);
    },

    hashData: async (data: string): Promise<string> => {
        const msgUint8 = encodeUTF8(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Password-based Vault Encryption
    encryptVault: async (password: string): Promise<string> => {
        const keys = cryptoService.getOrGenerateSigningKeys();
        const enc = new TextEncoder();
        const pwHash = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            pwHash,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(keys.secretKey));
        
        const vaultObj = {
            v: 1,
            iv: encodeBase64(iv),
            salt: encodeBase64(salt),
            data: encodeBase64(new Uint8Array(ciphertext))
        };
        return JSON.stringify(vaultObj);
    },

    decryptVault: async (vaultJson: string, password: string): Promise<string> => {
        const vault = JSON.parse(vaultJson);
        const enc = new TextEncoder();
        const pwHash = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: decodeBase64(vault.salt), iterations: 100000, hash: 'SHA-256' },
            pwHash,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: decodeBase64(vault.iv) },
            key,
            decodeBase64(vault.data)
        );
        return new TextDecoder().decode(decrypted);
    }
};
