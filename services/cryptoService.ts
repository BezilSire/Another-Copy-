import * as tweetnacl from 'tweetnacl';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer';

const nacl = (tweetnacl as any).default || tweetnacl;

const SIGN_SECRET_KEY_STORAGE = 'gcn_sign_secret_key';
const SIGN_PUBLIC_KEY_STORAGE = 'gcn_sign_public_key';
const ENCRYPTED_VAULT_STORAGE = 'gcn_encrypted_vault';

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

export const cryptoService = {
    generateMnemonic: (): string => {
        return bip39.generateMnemonic();
    },

    validateMnemonic: (mnemonic: string): boolean => {
        return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
    },

    mnemonicToKeyPair: (mnemonic: string) => {
        const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
        const secretKey = seed.slice(0, 32);
        const keyPair = nacl.sign.keyPair.fromSeed(secretKey);
        
        return {
            publicKey: `UBT-${encodeBase64(keyPair.publicKey)}`,
            secretKey: encodeBase64(keyPair.secretKey)
        };
    },

    hasVault: (): boolean => {
        return !!localStorage.getItem(ENCRYPTED_VAULT_STORAGE);
    },

    saveVault: async (data: VaultData, pin: string) => {
        const encrypted = await cryptoService._encryptWithPin(JSON.stringify(data), pin);
        localStorage.setItem(ENCRYPTED_VAULT_STORAGE, encrypted);
        
        const keys = cryptoService.mnemonicToKeyPair(data.mnemonic);
        localStorage.setItem(SIGN_PUBLIC_KEY_STORAGE, keys.publicKey);
        localStorage.setItem(SIGN_SECRET_KEY_STORAGE, keys.secretKey);
    },

    unlockVault: async (pin: string): Promise<VaultData | null> => {
        const encrypted = localStorage.getItem(ENCRYPTED_VAULT_STORAGE);
        if (!encrypted) return null;

        try {
            const dataStr = await cryptoService._decryptWithPin(encrypted, pin);
            const data = JSON.parse(dataStr) as VaultData;
            if (!bip39.validateMnemonic(data.mnemonic)) return null;
            
            const keys = cryptoService.mnemonicToKeyPair(data.mnemonic);
            localStorage.setItem(SIGN_PUBLIC_KEY_STORAGE, keys.publicKey);
            localStorage.setItem(SIGN_SECRET_KEY_STORAGE, keys.secretKey);
            return data;
        } catch (e) {
            return null;
        }
    },

    _encryptWithPin: async (text: string, pin: string): Promise<string> => {
        const enc = new TextEncoder();
        const pinBuffer = enc.encode(pin).buffer as ArrayBuffer;
        const pwHash = await crypto.subtle.importKey('raw', pinBuffer, { name: 'PBKDF2' }, false, ['deriveKey']);
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 1000, hash: 'SHA-256' },
            pwHash,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, enc.encode(text).buffer as ArrayBuffer);
        
        const vaultObj = {
            iv: encodeBase64(iv),
            salt: encodeBase64(salt),
            data: encodeBase64(new Uint8Array(ciphertext))
        };
        return JSON.stringify(vaultObj);
    },

    _decryptWithPin: async (vaultJson: string, pin: string): Promise<string> => {
        const vault = JSON.parse(vaultJson);
        const enc = new TextEncoder();
        const pinBuffer = enc.encode(pin).buffer as ArrayBuffer;
        const pwHash = await crypto.subtle.importKey('raw', pinBuffer, { name: 'PBKDF2' }, false, ['deriveKey']);
        
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: decodeBase64(vault.salt).buffer as ArrayBuffer, iterations: 1000, hash: 'SHA-256' },
            pwHash,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: decodeBase64(vault.iv).buffer as ArrayBuffer },
            key,
            decodeBase64(vault.data).buffer as ArrayBuffer
        );
        return new TextDecoder().decode(decrypted);
    },

    getPublicKey: (): string | null => localStorage.getItem(SIGN_PUBLIC_KEY_STORAGE),
    
    signTransaction: (payload: string): string => {
        const storedSecret = localStorage.getItem(SIGN_SECRET_KEY_STORAGE);
        if (!storedSecret) throw new Error("Vault locked.");
        const secretKey = decodeBase64(storedSecret);
        const signature = nacl.sign.detached(encodeUTF8(payload), secretKey);
        return encodeBase64(signature);
    },

    verifySignature: (payload: string, signatureBase64: string, publicKeyBase64WithPrefix: string): boolean => {
        try {
            const publicKeyBase64 = publicKeyBase64WithPrefix.startsWith('UBT-') 
                ? publicKeyBase64WithPrefix.substring(4) 
                : publicKeyBase64WithPrefix;
                
            const publicKey = decodeBase64(publicKeyBase64);
            const signature = decodeBase64(signatureBase64);
            return nacl.sign.detached.verify(encodeUTF8(payload), signature, publicKey);
        } catch (e) {
            return false;
        }
    },

    generateNonce: (): string => encodeBase64(window.crypto.getRandomValues(new Uint8Array(12))),
    
    clearSession: () => {
        localStorage.removeItem(SIGN_SECRET_KEY_STORAGE);
        localStorage.removeItem(SIGN_PUBLIC_KEY_STORAGE);
    }
};