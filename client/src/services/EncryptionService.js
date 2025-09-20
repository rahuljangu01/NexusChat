import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8 } from 'tweetnacl-util';
import { storePublicKey, getPublicKey } from '../utils/api';

const KEY_PAIR_STORAGE_KEY = 'nexus-e2ee-keypair';

// Helper functions (in case Buffer is not available in all environments)
const toBase64 = (bytes) => {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));
};
const fromBase64 = (base64) => {
    return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
};


class EncryptionService {
    constructor() {
        this.keyPair = null;
        this.theirPublicKeys = {}; // Cache for other users' public keys
    }

    // Keys ko generate ya load karna
    async initialize() {
        let storedKeyPair = localStorage.getItem(KEY_PAIR_STORAGE_KEY);
        if (storedKeyPair) {
            this.keyPair = JSON.parse(storedKeyPair);
            console.log("E2EE Keys loaded from Local Storage.");
        } else {
            console.log("No E2EE keys found in Local Storage. Generating new ones...");
            const newKeyPair = nacl.box.keyPair();
            this.keyPair = {
                publicKey: toBase64(newKeyPair.publicKey),
                secretKey: toBase64(newKeyPair.secretKey),
            };
            localStorage.setItem(KEY_PAIR_STORAGE_KEY, JSON.stringify(this.keyPair));
            
            try {
                console.log("Attempting to store Public Key on server:", this.keyPair.publicKey);
                await storePublicKey({ publicKey: this.keyPair.publicKey });
                console.log("SUCCESS: E2EE Keys generated and public key stored on server.");
            } catch (error) {
                console.error("FAILURE: Failed to store public key on server.", error);
            }
        }
    }
    
    // Doosre user ki public key fetch karna
    async getTheirPublicKey(userId) {
        if (this.theirPublicKeys[userId]) {
            return fromBase64(this.theirPublicKeys[userId]);
        }
        try {
            console.log(`Fetching public key for user: ${userId}`);
            const { publicKey } = await getPublicKey(userId);
            console.log(`SUCCESS: Fetched public key for user ${userId}`);
            this.theirPublicKeys[userId] = publicKey;
            return fromBase64(publicKey);
        } catch (error) {
            console.error(`FAILURE: Could not fetch public key for user ${userId}`, error);
            throw new Error("Recipient's public key not found.");
        }
    }

    // Message ko encrypt karna
    async encrypt(message, theirPublicKey) {
        const secretKey = fromBase64(this.keyPair.secretKey);
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const messageBytes = decodeUTF8(message);

        const encryptedBox = nacl.box(messageBytes, nonce, theirPublicKey, secretKey);

        const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
        fullMessage.set(nonce);
        fullMessage.set(encryptedBox, nonce.length);

        return toBase64(fullMessage);
    }
    
    // Message ko decrypt karna
    decrypt(encryptedMessage, theirPublicKey) {
        const secretKey = fromBase64(this.keyPair.secretKey);
        
        if (typeof encryptedMessage !== 'string' || encryptedMessage.length === 0) {
            throw new Error("Invalid encrypted message format.");
        }
        const messageWithNonce = fromBase64(encryptedMessage);

        const nonce = messageWithNonce.slice(0, nacl.box.nonceLength);
        const box = messageWithNonce.slice(nacl.box.nonceLength);

        const decryptedBytes = nacl.box.open(box, nonce, theirPublicKey, secretKey);
        
        if (!decryptedBytes) {
            throw new Error("Decryption failed. This might be because of a key mismatch or tampered message.");
        }

        return encodeUTF8(decryptedBytes);
    }

    fromBase64 = (base64) => fromBase64(base64);
}

export const encryptionService = new EncryptionService();