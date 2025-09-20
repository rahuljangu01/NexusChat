import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8 } from 'tweetnacl-util';
import { storePublicKey, getPublicKey } from '../utils/api';

const KEY_PAIR_STORAGE_KEY = 'nexus-e2ee-keypair';

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
        } else {
            const newKeyPair = nacl.box.keyPair();
            this.keyPair = {
                publicKey: this.toBase64(newKeyPair.publicKey),
                secretKey: this.toBase64(newKeyPair.secretKey),
            };
            localStorage.setItem(KEY_PAIR_STORAGE_KEY, JSON.stringify(this.keyPair));
            
            // Nayi public key ko server par store karo
            try {
                await storePublicKey(this.keyPair.publicKey);
                console.log("E2EE Keys generated and stored on server.");
            } catch (error) {
                console.error("Failed to store public key on server:", error);
            }
        }
    }
    
    // Doosre user ki public key fetch karna
    async getTheirPublicKey(userId) {
        if (this.theirPublicKeys[userId]) {
            return this.fromBase64(this.theirPublicKeys[userId]);
        }
        try {
            const { publicKey } = await getPublicKey(userId);
            this.theirPublicKeys[userId] = publicKey;
            return this.fromBase64(publicKey);
        } catch (error) {
            console.error(`Could not fetch public key for user ${userId}`, error);
            throw new Error("Recipient's public key not found.");
        }
    }

    // Message ko encrypt karna
    async encrypt(message, theirPublicKey) {
        const secretKey = this.fromBase64(this.keyPair.secretKey);
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const messageBytes = decodeUTF8(message);

        const encryptedBox = nacl.box(messageBytes, nonce, theirPublicKey, secretKey);

        const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
        fullMessage.set(nonce);
        fullMessage.set(encryptedBox, nonce.length);

        return this.toBase64(fullMessage);
    }
    
    // Message ko decrypt karna
    decrypt(encryptedMessage, theirPublicKey) {
        const secretKey = this.fromBase64(this.keyPair.secretKey);
        const messageWithNonce = this.fromBase64(encryptedMessage);

        const nonce = messageWithNonce.slice(0, nacl.box.nonceLength);
        const box = messageWithNonce.slice(nacl.box.nonceLength);

        const decryptedBytes = nacl.box.open(box, nonce, theirPublicKey, secretKey);
        
        if (!decryptedBytes) {
            throw new Error("Decryption failed. Message may have been tampered with.");
        }

        return encodeUTF8(decryptedBytes);
    }

    toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
    fromBase64 = (base64) => new Uint8Array(Buffer.from(base64, 'base64'));
}

export const encryptionService = new EncryptionService();