
export const getEnvVar = (key: string) => {
    try {
        // @ts-ignore - Vite environment
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
            return (import.meta as any).env[key];
        }
    } catch (e) {}
    
    try {
        // Node.js environment
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}
    
    return null;
};

export const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('GEMINI_API_KEY') || '';
