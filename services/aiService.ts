import { GoogleGenAI } from "@google/genai";
import { ZimNews, AgenticTask, User } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const aiService = {
    generateResponse: async (prompt: string, systemInstruction: string = "You are a helpful AI assistant for small businesses in Zimbabwe. You speak Shona, Ndebele, and English.") => {
        try {
            // Prefer server-side chat endpoint to use OpenRouter models
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";
            }

            // Fallback to Gemini if server endpoint fails
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
            const geminiResponse = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    systemInstruction
                }
            });
            return geminiResponse.text || "I'm sorry, I couldn't process that request.";
        } catch (error) {
            console.error("AI Service Error:", error);
            return "I encountered an error while processing your request. Please try again later.";
        }
    },

    // Agentic logic: Analyze a request and determine which tools to use
    processAgenticTask: async (user: User, taskDescription: string): Promise<AgenticTask> => {
        const systemPrompt = `
            You are an Agentic AI for Zimbabwe. 
            Available Tools: 
            - search_zim_news: Find latest news in Zim.
            - market_prices: Get current commodity prices in Zim markets.
            - ubt_transfer: Prepare a transaction for the user.
            - social_pulse: Analyze social media trends in Zim.

            Analyze the user's request and respond in JSON format:
            {
                "status": "processing",
                "tools_required": ["tool1", "tool2"],
                "reasoning": "Why these tools are needed"
            }
        `;

        const aiAnalysis = await aiService.generateResponse(taskDescription, systemPrompt);
        let tools: string[] = [];
        try {
            // Clean up potential markdown code blocks
            const cleanJson = aiAnalysis.replace(/```json/g, '').replace(/```/g, '').trim();
            if (cleanJson) {
                const parsed = JSON.parse(cleanJson);
                tools = parsed.tools_required || [];
            }
        } catch (e) {
            // Fallback if AI doesn't return perfect JSON
            if (aiAnalysis.includes("search_zim_news")) tools.push("search_zim_news");
            if (aiAnalysis.includes("market_prices")) tools.push("market_prices");
            if (aiAnalysis.includes("ubt_transfer")) tools.push("ubt_transfer");
            if (aiAnalysis.includes("social_pulse")) tools.push("social_pulse");
        }

        return {
            id: `task-${Date.now()}`,
            userId: user.id,
            description: taskDescription,
            status: 'processing',
            createdAt: { seconds: Math.floor(Date.now()/1000), nanoseconds: 0 } as any,
            toolsUsed: tools
        };
    },

    translateToLocal: async (text: string, targetLanguage: 'shona' | 'ndebele') => {
        const prompt = `Translate the following text to ${targetLanguage}: "${text}"`;
        return aiService.generateResponse(prompt, "You are a professional translator for Zimbabwean languages.");
    }
};
