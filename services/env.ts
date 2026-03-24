
export const getEnvVar = (key: string) => {
    // 1. Try Vite's import.meta.env (Client-side)
    try {
        // @ts-ignore
        const meta = import.meta as any;
        if (typeof meta !== 'undefined' && meta.env && meta.env[key]) {
            return meta.env[key];
        }
    } catch (e) {}
    
    // 2. Try Node's process.env (Server-side)
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}
    
    return null;
};

// For client-side, we MUST use VITE_ prefix for variables to be exposed
// However, we've also exposed GEMINI_API_KEY via vite.config.ts define
// We use a try-catch to safely access process.env which might be defined by Vite
let clientGeminiKey = '';
try {
    // @ts-ignore - Vite will replace this string if it's defined in vite.config.ts
    clientGeminiKey = process.env.GEMINI_API_KEY || '';
} catch (e) {}

export const GEMINI_API_KEY = getEnvVar('VITE_GEMINI_API_KEY') || clientGeminiKey || getEnvVar('GEMINI_API_KEY') || '';
