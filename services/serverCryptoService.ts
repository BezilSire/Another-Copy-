
import crypto from 'crypto';

export const serverCryptoService = {
    hashObject: (obj: any): string => {
        const str = JSON.stringify(obj);
        return crypto.createHash('sha256').update(str).digest('hex');
    },
    
    calculateHash: (data: string): string => {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
};
