import CryptoJS from 'crypto-js';

// We use an environment variable combined with the specific classroom ID 
// to create a unique encryption key for each classroom that never touches the backend.
const getSecretKey = (classroomId) => {
    const globalSecret = import.meta.env.VITE_CHAT_SECRET || 'zynk_fallback_secret_key_123';
    return `${globalSecret}_${classroomId}`;
};

export const encryptMessage = (plainText, classroomId) => {
    try {
        if (!plainText) return '';
        const secretKey = getSecretKey(classroomId);
        // AES encryption
        const cipherText = CryptoJS.AES.encrypt(plainText, secretKey).toString();
        return cipherText;
    } catch (error) {
        console.error('Error encrypting message:', error);
        return plainText; // Fallback or throw error depending on strictness
    }
};

export const decryptMessage = (cipherText, classroomId) => {
    try {
        if (!cipherText) return '';
        const secretKey = getSecretKey(classroomId);
        // AES decryption
        const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
        const plainText = bytes.toString(CryptoJS.enc.Utf8);
        
        // If decryption fails due to wrong key, plainText will be empty or malformed
        return plainText || cipherText; 
    } catch (error) {
        console.error('Error decrypting message:', error);
        return cipherText; // Return original if decryption completely faults
    }
};
