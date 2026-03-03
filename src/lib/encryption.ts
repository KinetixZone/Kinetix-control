import CryptoJS from 'crypto-js';

// En un entorno real, esta llave vendría de una variable de entorno segura
// Para este proyecto, usamos una llave maestra para la encriptación de datos sensibles
const MASTER_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'kinetix-secure-key-2024';

export const encryptData = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, MASTER_KEY).toString();
};

export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // Si no hay resultado, devolvemos el original (para datos no encriptados previos)
    return decrypted || ciphertext;
  } catch (e) {
    // Si falla la desencriptación, devolvemos el original
    return ciphertext;
  }
};
