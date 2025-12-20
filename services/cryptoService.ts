
import * as tweetnacl from 'tweetnacl';

// Robustly resolve the nacl object, checking for 'default' export or direct attachment
// This handles different ESM environment behaviors
const nacl = (tweetnacl as any).default || tweetnacl;

const SIGN_SECRET_KEY_STORAGE = 'gcn_sign_secret_key';
const SIGN_PUBLIC_KEY_STORAGE = 'gcn_sign_public_key';

interface KeyPair {
    publicKey: string; // Base64
    secretKey: string; // Base64
}

// --- Native Helpers (Replaces tweetnacl-util) ---

const encodeUTF8 = (s: string): Uint8Array => {
    return new TextEncoder().encode(s);
};

const decodeUTF8 = (arr: Uint8Array): string => {
    return new TextDecoder().decode(arr);
};

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
        // Remove any whitespace
        const cleanString = s.replace(/\s/g, '');
        const binary_string = window.atob(cleanString);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Failed to decode Base64", e);
        return new Uint8Array(0);
    }
};

// --- Service Implementation ---

export const cryptoService = {
    /**
     * Generates or retrieves a persistent signing key pair (Ed25519).
     */
    getOrGenerateSigningKeys: (): KeyPair => {
        const storedSecret = localStorage.getItem(SIGN_SECRET_KEY_STORAGE);
        const storedPublic = localStorage.getItem(SIGN_PUBLIC_KEY_STORAGE);

        if (storedSecret && storedPublic) {
            return { publicKey: storedPublic, secretKey: storedSecret };
        }

        // Ensure nacl.sign exists before calling it
        if (!nacl || !nacl.sign) {
            console.error("TweetNaCl library not loaded correctly.");
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
        return localStorage.getItem(SIGN_PUBLIC_KEY_STORAGE);
    },

    /**
     * Signs a transaction payload string.
     * Returns the signature in Base64.
     */
    signTransaction: (payload: string): string => {
        const keys = cryptoService.getOrGenerateSigningKeys();
        const secretKey = decodeBase64(keys.secretKey);
        const messageUint8 = encodeUTF8(payload);
        
        const signature = nacl.sign.detached(messageUint8, secretKey);
        return encodeBase64(signature);
    },

    /**
     * Verifies a signature against a public key.
     */
    verifySignature: (payload: string, signatureBase64: string, publicKeyBase64: string): boolean => {
        try {
            const publicKey = decodeBase64(publicKeyBase64);
            const signature = decodeBase64(signatureBase64);
            const message = encodeUTF8(payload);
            
            return nacl.sign.detached.verify(message, signature, publicKey);
        } catch (e) {
            console.error("Verification error:", e);
            return false;
        }
    },

    /**
     * Creates a unique nonce for transaction uniqueness
     */
    generateNonce: (): string => {
        const array = new Uint8Array(12);
        window.crypto.getRandomValues(array);
        return encodeBase64(array);
    },

    /**
     * Resets the local wallet keys. 
     * WARNING: This results in loss of control over the previous identity if not backed up.
     */
    resetKeys: (): KeyPair => {
        localStorage.removeItem(SIGN_PUBLIC_KEY_STORAGE);
        localStorage.removeItem(SIGN_SECRET_KEY_STORAGE);
        return cryptoService.getOrGenerateSigningKeys();
    }
};
