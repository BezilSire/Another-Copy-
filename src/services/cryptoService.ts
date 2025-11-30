
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

// Keys in Local Storage
const PRIVATE_KEY_STORAGE = 'gcn_private_key';
const PUBLIC_KEY_STORAGE = 'gcn_public_key';

interface KeyPair {
    publicKey: string;
    secretKey: string;
}

export const cryptoService = {
    /**
     * Gets the local key pair or generates a new one if it doesn't exist.
     * Note: In a real production app, the private key should be encrypted with the user's password.
     */
    getOrGenerateKeyPair: (): KeyPair => {
        const storedPrivate = localStorage.getItem(PRIVATE_KEY_STORAGE);
        const storedPublic = localStorage.getItem(PUBLIC_KEY_STORAGE);

        if (storedPrivate && storedPublic) {
            return { publicKey: storedPublic, secretKey: storedPrivate };
        }

        const newKeys = nacl.box.keyPair();
        const publicKeyBase64 = encodeBase64(newKeys.publicKey);
        const secretKeyBase64 = encodeBase64(newKeys.secretKey);

        localStorage.setItem(PUBLIC_KEY_STORAGE, publicKeyBase64);
        localStorage.setItem(PRIVATE_KEY_STORAGE, secretKeyBase64);

        return { publicKey: publicKeyBase64, secretKey: secretKeyBase64 };
    },

    getPublicKey: (): string | null => {
        return localStorage.getItem(PUBLIC_KEY_STORAGE);
    },

    /**
     * Encrypts a message for a specific recipient using their public key.
     */
    encryptMessage: (message: string, recipientPublicKeyBase64: string) => {
        const myKeys = cryptoService.getOrGenerateKeyPair();
        const mySecretKey = decodeBase64(myKeys.secretKey);
        const theirPublicKey = decodeBase64(recipientPublicKeyBase64);

        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const messageUint8 = encodeUTF8(message);

        const encryptedBox = nacl.box(messageUint8, nonce, theirPublicKey, mySecretKey);

        const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
        fullMessage.set(nonce);
        fullMessage.set(encryptedBox, nonce.length);

        return encodeBase64(fullMessage);
    },

    /**
     * Decrypts a message sent by a specific sender.
     */
    decryptMessage: (ciphertextBase64: string, senderPublicKeyBase64: string): string | null => {
        try {
            const myKeys = cryptoService.getOrGenerateKeyPair();
            const mySecretKey = decodeBase64(myKeys.secretKey);
            const theirPublicKey = decodeBase64(senderPublicKeyBase64);

            const messageWithNonceAsUint8 = decodeBase64(ciphertextBase64);
            const nonce = messageWithNonceAsUint8.slice(0, nacl.box.nonceLength);
            const message = messageWithNonceAsUint8.slice(nacl.box.nonceLength, messageWithNonceAsUint8.length);

            const decrypted = nacl.box.open(message, nonce, theirPublicKey, mySecretKey);

            if (!decrypted) {
                return null; // Decryption failed
            }

            return decodeUTF8(decrypted);
        } catch (e) {
            console.error("Decryption error:", e);
            return null;
        }
    }
};
