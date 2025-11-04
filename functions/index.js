const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();
const db = admin.firestore();

// --- Utils ---
const generateAgentCode = () => {
  const prefix = 'UGC';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
};

const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like I, O, 0, 1
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- Gemini ---
// Ensure you have set the API key in your Firebase environment configuration
// firebase functions:config:set env.api_key="YOUR_API_KEY"
const GEMINI_API_KEY = functions.config().env.api_key;
let ai;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.warn("Gemini API Key is missing from Firebase environment config.");
}

const generateWelcomeMessage = async (name) => {
  if (!ai) {
    return `Welcome, ${name}! We are excited to have you in the Global Commons Network.`;
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, friendly, and inspiring welcome message for a new member named "${name}" joining the Global Commons Network. Keep it under 280 characters. Be warm and encouraging.`,
      config: { temperature: 0.8 },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating welcome message with Gemini:", error);
    return `Welcome, ${name}! We are excited to have you in the Global Commons Network.`;
  }
};
