import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_API_KEY } from "./env";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const callAI = async (prompt: string, systemInstruction: string = "", jsonMode: boolean = false) => {
  try {
    // Try server-side chat endpoint first (uses OpenRouter)
    // In browser, this is relative. On server, we might need full URL or handle it differently.
    // However, since this is used in components, it's mostly client-side.
    // For server-side calls, we should ideally call the logic directly.
    
    const isServer = typeof window === 'undefined';
    if (!isServer) {
      const response = await axios.post('/api/chat', {
        messages: [
          { role: 'system', content: systemInstruction || "You are a helpful AI assistant for the Ubuntium Global Commons." },
          { role: 'user', content: prompt + (jsonMode ? " Respond ONLY with a valid JSON object." : "") }
        ]
      });

      if (response.status === 200) {
        const data = response.data;
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          if (jsonMode) {
            try {
              // Clean up potential markdown code blocks
              const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
              try {
                return JSON.parse(cleanJson);
              } catch (innerError) {
                // Try to find the first { and last } if parsing failed
                const start = cleanJson.indexOf('{');
                const end = cleanJson.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                  const extracted = cleanJson.substring(start, end + 1);
                  try {
                    return JSON.parse(extracted);
                  } catch (secondError) {
                    console.error("Aggressive JSON extraction failed:", secondError);
                    throw innerError;
                  }
                }
                throw innerError;
              }
            } catch (e) {
              console.error("Failed to parse JSON from AI response:", e);
              return {};
            }
          } else {
            return content;
          }
        }
      }
    }
  } catch (error) {
    console.error("AI call failed, falling back to Gemini:", error);
  }

  // Fallback to Gemini
  try {
    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });
    const text = geminiResponse.text || "";
    return jsonMode ? JSON.parse(text || '{}') : text;
  } catch (error) {
    console.error("Gemini fallback failed:", error);
    return jsonMode ? {} : "";
  }
};

export const generateWelcomeMessage = async (name: string) => {
  const prompt = `Generate a short, inspiring, and futuristic welcome message for a new member named ${name} joining the Ubuntium Global Commons. Keep it under 50 words.`;
  const result = await callAI(prompt);
  return result || `Welcome, ${name}. Your node is now active in the Ubuntium Global Commons.`;
};

export const generateProjectIdea = async (skills: string[], interests: string[]) => {
  const prompt = `Generate a detailed project idea for the Ubuntium Global Commons based on these skills: ${skills.join(', ')} and interests: ${interests.join(', ')}. 
  Return a JSON object with: projectName, category, justification (opportunity, dataBackedReasoning), requirements (equipment, materials, skills), budgetBreakdown (item, cost, notes), totalEstimatedCost, executionPlan (step, action, details), impactSummary.`;
  return await callAI(prompt, "", true);
};

export const elaborateBusinessIdea = async (idea: string) => {
  const prompt = `Elaborate on this business idea for a community venture: "${idea}". 
  Return a JSON object with: suggestedNames (array), detailedPlan (string), impactAnalysis (score, reasoning).`;
  return await callAI(prompt, "", true);
};

export const analyzeTargetMarket = async (plan: string, market: string) => {
  const prompt = `Analyze the target market "${market}" for this venture plan: "${plan}". 
  Return a JSON object with: personas (array of {name, demographics, needs, painPoints}), requiredSkills (array).`;
  return await callAI(prompt, "", true);
};

export const generatePitchDeck = async (plan: string) => {
  const prompt = `Generate a 5-slide pitch deck outline for this venture plan: "${plan}". 
  Return a JSON object with: title, slides (array of {title, content}).`;
  return await callAI(prompt, "", true);
};

export const initializeChat = async (systemInstruction: string) => {
    // For direct chat, we still use Gemini as a base if needed, 
    // but the main AgenticShell uses agentService which uses /api/chat.
    return ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction }
    });
};

export const getChatBotResponse = async (chat: any, message: string) => {
    // Try to use the common AI caller if possible, but chat objects are stateful.
    // For simplicity, we'll keep the chat object logic but it will use Gemini.
    // The main app uses AgenticShell which is already updated to use OpenRouter.
    try {
        const response = await chat.sendMessage({ message });
        return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Connection to the neural network was interrupted.";
    }
};
