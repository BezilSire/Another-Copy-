import { GoogleGenAI, Type, Chat } from '@google/genai';
import { User, Post, PublicUserProfile } from '../types';

const GEMINI_API_KEY = process.env.API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("Gemini API Key is missing. Ensure the `API_KEY` environment variable is set in your project settings.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- ChatBot Functions ---
let chat: Chat | null = null;

export const initializeChat = (history?: any[]) => {
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history || [],
    config: {
      systemInstruction: 'You are a helpful assistant for the Global Commons Network, a community-driven economic platform. Be concise and helpful.'
    }
  });
};

export const getChatBotResponse = async (message: string): Promise<string> => {
  if (!chat) {
    initializeChat();
  }
  const response = await chat!.sendMessage({ message });
  return response.text;
};


// --- Post Impact Evaluation ---
export const evaluatePostImpact = async (content: string, type: string): Promise<{ impactScore: number; reasoning: string; suggestionsForImprovement: string; ccapAward: number; }> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      impactScore: { type: Type.INTEGER, description: 'A score from 1-10 on the potential impact of this post.' },
      reasoning: { type: Type.STRING, description: 'A brief, one-sentence justification for the score.' },
      suggestionsForImprovement: { type: Type.STRING, description: 'If the score is below 7, provide 1-2 concrete suggestions for how the user can improve the post. Otherwise, this is an empty string.' },
      ccapAward: { type: Type.INTEGER, description: 'The amount of CCAP to award. If score < 7, award 0. If 7, award 5. If 8, award 10. If 9, award 20. If 10, award 35.' },
    },
    required: ['impactScore', 'reasoning', 'suggestionsForImprovement', 'ccapAward'],
  };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the following user post for its potential impact within a community-driven economic commons. The post type is "${type}". Content: "${content}". Provide a score from 1-10 on its potential for creating value, collaboration, or opportunity. If the score is below 7, provide specific suggestions for improvement. Also determine a CCAP award based on the score: score < 7 -> 0 CCAP; score 7 -> 5 CCAP; score 8 -> 10 CCAP; score 9 -> 20 CCAP; score 10 -> 35 CCAP.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const json = JSON.parse(response.text);
  return json;
};

// --- Project Launchpad ---
export const generateProjectIdea = async (): Promise<any> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      projectName: { type: Type.STRING },
      category: { type: Type.STRING },
      justification: { type: Type.OBJECT, properties: { opportunity: { type: Type.STRING }, dataBackedReasoning: { type: Type.STRING } } },
      requirements: { type: Type.OBJECT, properties: { equipment: { type: Type.ARRAY, items: { type: Type.STRING } }, materials: { type: Type.ARRAY, items: { type: Type.STRING } }, skills: { type: Type.ARRAY, items: { type: Type.STRING } } } },
      budgetBreakdown: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { item: { type: Type.STRING }, cost: { type: Type.NUMBER }, notes: { type: Type.STRING } } } },
      totalEstimatedCost: { type: Type.NUMBER },
      executionPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { step: { type: Type.INTEGER }, action: { type: Type.STRING }, details: { type: Type.STRING } } } },
      timeline: { type: Type.OBJECT, properties: { setup: { type: Type.STRING }, launch: { type: Type.STRING } } },
      financials: { type: Type.OBJECT, properties: { pricingStrategy: { type: Type.STRING }, breakEvenAnalysis: { type: Type.STRING }, marketingStrategy: { type: Type.STRING } } },
      riskAnalysis: { type: Type.OBJECT, properties: { challenges: { type: Type.ARRAY, items: { type: Type.STRING } }, mitigation: { type: Type.ARRAY, items: { type: Type.STRING } } } },
      scalability: { type: Type.STRING },
      commonsFeedbackLoop: { type: Type.STRING },
      externalResources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING } } } },
    },
  };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a robust, real-world business idea that can be launched in Zimbabwe with a budget between $200 and $500. The business should be from a diverse sector (not just solar/energy). Provide a comprehensive plan including justification, requirements, budget, execution plan, timeline, financials, risk analysis, scalability, and how it can create value within a community commons. Also include links to external resources if possible.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  return JSON.parse(response.text);
};


// --- AI Venture Pitch Assistant ---
export const elaborateBusinessIdea = async (idea: string): Promise<{ suggestedNames: string[], detailedPlan: string, impactAnalysis: { score: number, reasoning: string } }> => {
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            suggestedNames: { type: Type.ARRAY, items: { type: Type.STRING } },
            detailedPlan: { type: Type.STRING },
            impactAnalysis: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, reasoning: { type: Type.STRING } } },
        },
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `A user has a business idea: "${idea}". Elaborate this into a detailed 2-paragraph plan. Suggest 3 creative names for the venture. Provide an "Impact Score" from 1-10 on its potential for community value and a brief justification.`,
        config: { responseMimeType: 'application/json', responseSchema },
    });
    return JSON.parse(response.text);
};

export const analyzeTargetMarket = async (detailedPlan: string, targetMarketDescription: string): Promise<{ personas: any[], requiredSkills: string[] }> => {
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            personas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, demographics: { type: Type.STRING }, needs: { type: Type.STRING }, painPoints: { type: Type.STRING } } } },
            requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `For the business plan "${detailedPlan}" targeting "${targetMarketDescription}", create 2 detailed user personas. Also, list the top 3-5 essential skills required to launch this venture (e.g., "Marketing", "Agriculture").`,
        config: { responseMimeType: 'application/json', responseSchema },
    });
    return JSON.parse(response.text);
};

export const generatePitchDeck = async (detailedPlan: string, lookingFor: string[]): Promise<{ title: string; slides: { title: string; content: string }[] }> => {
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            slides: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } } } },
        },
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on this plan: "${detailedPlan}", generate a 5-slide pitch deck. The slides should be: 1. The Problem, 2. Our Solution, 3. Target Market, 4. Business Model, 5. The Ask (mentioning they are looking for: ${lookingFor.join(', ')}).`,
        config: { responseMimeType: 'application/json', responseSchema },
    });
    return JSON.parse(response.text);
};

export const generateWelcomeMessage = async (name: string, circle: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a short, friendly, and inspiring welcome message for a new member named "${name}" joining the Global Commons Network from the "${circle}" circle. Keep it under 280 characters. Be warm and encouraging.`,
    config: {
      temperature: 0.8,
    },
  });
  return response.text;
};
