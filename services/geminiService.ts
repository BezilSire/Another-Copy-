import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateWelcomeMessage = async (name: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, inspiring, and futuristic welcome message for a new member named ${name} joining the Ubuntium Global Commons. Keep it under 50 words.`,
    });
    return response.text || `Welcome, ${name}. Your node is now active in the Ubuntium Global Commons.`;
  } catch (error) {
    console.error("Gemini error:", error);
    return `Welcome, ${name}. Your node is now active in the Ubuntium Global Commons.`;
  }
};

export const generateProjectIdea = async (skills: string[], interests: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed project idea for the Ubuntium Global Commons based on these skills: ${skills.join(', ')} and interests: ${interests.join(', ')}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING },
            category: { type: Type.STRING },
            justification: {
              type: Type.OBJECT,
              properties: {
                opportunity: { type: Type.STRING },
                dataBackedReasoning: { type: Type.STRING }
              },
              required: ["opportunity", "dataBackedReasoning"]
            },
            requirements: {
              type: Type.OBJECT,
              properties: {
                equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
                materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["equipment", "materials", "skills"]
            },
            budgetBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  cost: { type: Type.NUMBER },
                  notes: { type: Type.STRING }
                },
                required: ["item", "cost", "notes"]
              }
            },
            totalEstimatedCost: { type: Type.NUMBER },
            executionPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.NUMBER },
                  action: { type: Type.STRING },
                  details: { type: Type.STRING }
                },
                required: ["step", "action", "details"]
              }
            },
            impactSummary: { type: Type.STRING }
          },
          required: ["projectName", "category", "justification", "requirements", "budgetBreakdown", "totalEstimatedCost", "executionPlan", "impactSummary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini error:", error);
    throw error;
  }
};

export const elaborateBusinessIdea = async (idea: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Elaborate on this business idea for a community venture: "${idea}". Provide a structured plan including suggested names, a detailed plan, and an impact analysis.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedNames: { type: Type.ARRAY, items: { type: Type.STRING } },
            detailedPlan: { type: Type.STRING },
            impactAnalysis: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                reasoning: { type: Type.STRING }
              },
              required: ["score", "reasoning"]
            }
          },
          required: ["suggestedNames", "detailedPlan", "impactAnalysis"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      suggestedNames: ["Community Venture"],
      detailedPlan: "Plan for: " + idea,
      impactAnalysis: { score: 70, reasoning: "Default impact analysis." }
    };
  }
};

export const analyzeTargetMarket = async (plan: string, market: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the target market "${market}" for this venture plan: "${plan}". Identify client personas and required skills for the team.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  demographics: { type: Type.STRING },
                  needs: { type: Type.STRING },
                  painPoints: { type: Type.STRING }
                },
                required: ["name", "demographics", "needs", "painPoints"]
              }
            },
            requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["personas", "requiredSkills"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      personas: [{ name: "General User", demographics: "All", needs: "Access", painPoints: "None" }],
      requiredSkills: ["Management"]
    };
  }
};

export const generatePitchDeck = async (plan: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a 5-slide pitch deck outline for this venture plan: "${plan}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["title", "content"]
              }
            }
          },
          required: ["title", "slides"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      title: "Pitch Deck",
      slides: [{ title: "Introduction", content: "Venture Overview" }]
    };
  }
};

export const initializeChat = async (systemInstruction: string) => {
    return ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction }
    });
};

export const getChatBotResponse = async (chat: any, message: string) => {
    try {
        const response = await chat.sendMessage({ message });
        return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Connection to the neural network was interrupted.";
    }
};
