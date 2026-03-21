
import * as tweetnacl from 'tweetnacl';
import * as bip39 from 'bip39';
import { safeJsonStringify } from '../utils';

const nacl = (tweetnacl as any).default || tweetnacl;

const SIGN_SECRET_KEY_STORAGE = 'gcn_sign_secret_key';
const SIGN_PUBLIC_KEY_STORAGE = 'gcn_sign_public_key';
const ENCRYPTED_VAULT_STORAGE = 'gcn_encrypted_vault';

export const UGC_DEFAULT_NODE_PIN = "ubuntium-default-node-pin";

export interface VaultData {
    mnemonic: string;
    email?: string;
    password?: string;
}

const encodeUTF8 = (s: string): Uint8Array => new TextEncoder().encode(s);

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

const toHex = (arr: Uint8Array): string => {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const cryptoService = {
    generateMnemonic: (): string => bip39.generateMnemonic(),

    validateMnemonic: (mnemonic: string): boolean => {
        try {
            return bip39.validateMnemonic(mnemonic.toLowerCase().trim());
        } catch (e) {
            return false;
        }
    },

    mnemonicToKeyPair: (mnemonic: string) => {
        const seed = bip39.mnemonicToSeedSync(mnemonic.toLowerCase().trim());
        const secretKey = seed.slice(0, 32);
        const keyPair = nacl.sign.keyPair.fromSeed(secretKey);
        
        return {
            publicKey: `UBT-${encodeBase64(keyPair.publicKey)}`,
            secretKey: encodeBase64(keyPair.secretKey)
        };
    },

    saveVault: async (data: VaultData, pin: string): Promise<string> => {
        const encrypted = await cryptoService._encryptWithPin(safeJsonStringify(data), pin);
        localStorage.setItem(ENCRYPTED_VAULT_STORAGE, encrypted);
        
        const keys = cryptoService.mnemonicToKeyPair(data.mnemonic);
        localStorage.setItem(SIGN_PUBLIC_KEY_STORAGE, keys.publicKey);
        localStorage.setItem(SIGN_SECRET_KEY_STORAGE, keys.secretKey);
        
        return encrypted;
    },

    // Fix: Added injectVault method to allow server-side vaults to be injected into local storage
    injectVault: (encryptedVault: string) => {
        localStorage.setItem(ENCRYPTED_VAULT_STORAGE, encryptedVault);
    },

    unlockVault: async (pin: string): Promise<VaultData | null> => {
        const encrypted = localStorage.getItem(ENCRYPTED_VAULT_STORAGE);
        if (!encrypted) return null;
        try {
            const dataStr = await cryptoService._decryptWithPin(encrypted, pin);
            const data = JSON.parse(dataStr);
            const keys = cryptoService.mnemonicToKeyPair(data.mnemonic);
            localStorage.setItem(SIGN_PUBLIC_KEY_STORAGE, keys.publicKey);
            localStorage.setItem(SIGN_SECRET_KEY_STORAGE, keys.secretKey);
            return data;
        } catch (e) {
            return null;
        }
    },

    hasVault: () => !!localStorage.getItem(ENCRYPTED_VAULT_STORAGE),

    getPublicKey: () => localStorage.getItem(SIGN_PUBLIC_KEY_STORAGE),
    getSecretKey: () => localStorage.getItem(SIGN_SECRET_KEY_STORAGE),
    getVault: () => localStorage.getItem(ENCRYPTED_VAULT_STORAGE),

    preparePayload: (data: any): string => {
        const { signature, hash, status, serverTimestamp, id, ...rest } = data;
        const sortedKeys = Object.keys(rest).sort();
        const sortedData = sortedKeys.reduce((acc: any, key) => {
            acc[key] = rest[key];
            return acc;
        }, {});
        return safeJsonStringify(sortedData);
    },

    hashTransaction: async (txData: any): Promise<string> => {
        const payload = cryptoService.preparePayload(txData);
        const msgUint8 = encodeUTF8(payload);
        // Cast to ArrayBuffer to satisfy BufferSource requirement
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8.buffer as ArrayBuffer);
        return encodeBase64(new Uint8Array(hashBuffer));
    },

    signTransaction: (payload: string): string => {
        const secretKeyBase64 = localStorage.getItem(SIGN_SECRET_KEY_STORAGE);
        if (!secretKeyBase64) throw new Error("VAULT_LOCKED");
        const secretKey = decodeBase64(secretKeyBase64);
        const signature = nacl.sign.detached(encodeUTF8(payload), secretKey);
        return encodeBase64(signature);
    },

    verifySignature: (payload: string, signature: string, publicKey: string): boolean => {
        try {
            const pubKeyArr = decodeBase64(publicKey.replace('UBT-', ''));
            const sigArr = decodeBase64(signature);
            return nacl.sign.detached.verify(encodeUTF8(payload), sigArr, pubKeyArr);
        } catch (e) {
            return false;
        }
    },

    generateNonce: () => encodeBase64(window.crypto.getRandomValues(new Uint8Array(16))),

    calculateHash: async (data: string): Promise<string> => {
        const msgUint8 = encodeUTF8(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8.buffer as ArrayBuffer);
        return toHex(new Uint8Array(hashBuffer));
    },

    calculateMerkleRoot: async (transactions: any[]): Promise<string> => {
        if (transactions.length === 0) return '0'.repeat(64);
        
        let hashes = await Promise.all(transactions.map(tx => cryptoService.hashTransaction(tx)));
        
        while (hashes.length > 1) {
            const nextLevel: string[] = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                const right = i + 1 < hashes.length ? hashes[i + 1] : left;
                const combined = await cryptoService.calculateHash(left + right);
                nextLevel.push(combined);
            }
            hashes = nextLevel;
        }
        
        return hashes[0];
    },

    calculateBlockHash: async (index: number, previousHash: string, timestamp: number, merkleRoot: string, nonce: number): Promise<string> => {
        const data = index + previousHash + timestamp + merkleRoot + nonce;
        return cryptoService.calculateHash(data);
    },

    mineBlock: async (index: number, previousHash: string, transactions: any[], difficulty: number, onProgress?: (nonce: number) => void): Promise<{ hash: string, nonce: number, timestamp: number, merkleRoot: string }> => {
        let nonce = 0;
        let timestamp = Date.now();
        let hash = '';
        const target = '0'.repeat(difficulty);
        const merkleRoot = await cryptoService.calculateMerkleRoot(transactions);
        
        while (true) {
            hash = await cryptoService.calculateBlockHash(index, previousHash, timestamp, merkleRoot, nonce);
            if (hash.startsWith(target)) {
                return { hash, nonce, timestamp, merkleRoot };
            }
            nonce++;
            if (nonce % 500 === 0) {
                if (onProgress) onProgress(nonce);
                await new Promise(resolve => setTimeout(resolve, 0));
                timestamp = Date.now();
            }
        }
    },

    // Fix: Added clearSession method to remove sensitive keys from local storage on logout
    clearSession: () => {
        localStorage.removeItem(SIGN_SECRET_KEY_STORAGE);
        localStorage.removeItem(SIGN_PUBLIC_KEY_STORAGE);
    },

    _encryptWithPin: async (text: string, pin: string): Promise<string> => {
        const enc = new TextEncoder();
        const pinBytes = enc.encode(pin);
        const pwKey = await crypto.subtle.importKey('raw', pinBytes as any, { name: 'PBKDF2' }, false, ['deriveKey']);
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt as any, iterations: 100000, hash: 'SHA-256' },
            pwKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as any }, key, enc.encode(text) as any);
        return JSON.stringify({ iv: encodeBase64(iv), salt: encodeBase64(salt), data: encodeBase64(new Uint8Array(ciphertext)) });
    },

    _decryptWithPin: async (vaultJson: string, pin: string): Promise<string> => {
        const vault = JSON.parse(vaultJson);
        const enc = new TextEncoder();
        const pinBytes = enc.encode(pin);
        const pwKey = await crypto.subtle.importKey('raw', pinBytes as any, { name: 'PBKDF2' }, false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: decodeBase64(vault.salt) as any, iterations: 100000, hash: 'SHA-256' },
            pwKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(vault.iv) as any }, key, decodeBase64(vault.data) as any);
        return new TextDecoder().decode(decrypted);
    },

    generateRecoverySecret: (): string => {
        const words = bip39.generateMnemonic().split(' ');
        // We only take 6 words for the recovery secret to make it easier to remember but still secure
        return words.slice(0, 6).join(' ');
    },

    hashRecoverySecret: async (secret: string): Promise<string> => {
        const msgUint8 = encodeUTF8(secret.toLowerCase().trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8.buffer as ArrayBuffer);
        return toHex(new Uint8Array(hashBuffer));
    },

    verifyRecoverySecret: async (secret: string, hashedSecret: string): Promise<boolean> => {
        const currentHash = await cryptoService.hashRecoverySecret(secret);
        return currentHash === hashedSecret;
    }
};
