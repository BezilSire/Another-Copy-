import { GoogleGenAI, Type } from "@google/genai";
import type { Chat, Content } from "@google/genai";

// FIX: Initialize GoogleGenAI with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat;

export const generateWelcomeMessage = async (name: string, circle: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  const prompt = `Generate a short, welcoming, and inspiring message for a new member named "${name}" who has just joined the "${circle}" Circle of the Ubuntium Global Commons. The message should be under 200 characters and reflect the philosophy of "I am because we are".`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating welcome message with Gemini:", error);
    // Fallback message in case of API error.
    return `Welcome to the Ubuntium Global Commons, ${name}! We are thrilled to have you join the ${circle} Circle. I am because we are.`;
  }
};

export const initializeChat = (history?: Content[]) => {
  const model = "gemini-2.5-flash";
  const systemInstruction = "You are a helpful assistant for the Ubuntium Global Commons, a community focused on mutual support and economic empowerment based on the philosophy of Ubuntu ('I am because we are'). Your goal is to provide helpful, concise, and friendly information about the commons, its structure (like Circles), its digital asset ($UBT), and its mission. Be supportive and encouraging. Do not provide financial advice.";
  
  chat = ai.chats.create({
    model,
    config: {
      systemInstruction
    },
    ...(history && { history }) // Pass history if it exists
  });
};

export const getChatBotResponse = async (prompt: string): Promise<string> => {
  if (!chat) {
    initializeChat();
  }
  const response = await chat.sendMessage({ message: prompt });
  return response.text;
};

export const elaborateBusinessIdea = async (businessIdea: string): Promise<{ suggestedNames: string[], detailedPlan: string, impactAnalysis: { score: number, reasoning: string } }> => {
    const model = 'gemini-2.5-pro';
    const prompt = `
      Analyze the following business idea for the African / Zimbabwean market: "${businessIdea}".
      
      Perform the following tasks:
      1.  Suggest 3 creative and relevant business names.
      2.  Write a detailed, elaborated plan for the product or service.
      3.  Provide an "Impact Analysis" for the local community. This analysis should include a score from 1 to 10 (where 10 is "highly essential") and a brief reasoning for the score.

      Return the response as a single JSON object. Do not include markdown code fences.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedNames: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Three suggested business names."
                        },
                        detailedPlan: {
                            type: Type.STRING,
                            description: "An elaborated plan for the product or service."
                        },
                        impactAnalysis: {
                            type: Type.OBJECT,
                            properties: {
                                score: { 
                                    type: Type.NUMBER,
                                    description: "An impact score from 1 to 10."
                                },
                                reasoning: { 
                                    type: Type.STRING,
                                    description: "The reasoning behind the impact score."
                                }
                            },
                            required: ["score", "reasoning"]
                        }
                    },
                    required: ["suggestedNames", "detailedPlan", "impactAnalysis"]
                }
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse AI response for business idea elaboration:", error);
        throw new Error("The AI failed to analyze the idea. Please try again.");
    }
};

export const analyzeTargetMarket = async (detailedPlan: string, targetMarket: string): Promise<{ personas: { name: string, demographics: string, needs: string, painPoints: string }[], requiredSkills: string[] }> => {
    const model = 'gemini-2.5-pro';
    const prompt = `
        Based on the following detailed business plan and target market description, perform two tasks:
        1. Generate 2 detailed client personas that represent the ideal customers.
        2. Identify and list the top 5 most essential skills required to successfully build and run this business.

        Business Plan: "${detailedPlan}"
        Target Market Description: "${targetMarket}"

        Return the response as a single JSON object. Do not include markdown code fences.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        personas: {
                            type: Type.ARRAY,
                            description: "An array of 2 client persona objects.",
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
                        requiredSkills: {
                            type: Type.ARRAY,
                            description: "An array of strings listing the top 5 essential skills.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["personas", "requiredSkills"]
                }
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse AI response for market analysis:", error);
        throw new Error("The AI failed to analyze the market. Please try again.");
    }
};

export const generatePitchDeck = async (businessIdea: string, lookingFor: string[]): Promise<{ title: string; slides: { title: string; content: string }[] }> => {
    const model = 'gemini-2.5-pro';
    const prompt = `
      Create a 5-slide pitch deck for a business idea. The idea is: "${businessIdea}".
      The founder is looking for: ${lookingFor.join(', ')}.

      The pitch deck should have the following slides:
      1. Title Slide: A compelling title for the business idea.
      2. Problem: What problem is this business solving?
      3. Solution: How does this business solve the problem?
      4. The Ask: What does the founder need (e.g., funding, partners, skills)? Be specific based on what they are looking for.
      5. Vision: What is the long-term vision for this business and its impact on the community?

      For each slide, provide a 'title' and 'content'. The content should be a concise paragraph.
      Return the response as a JSON object with the structure: { "title": "...", "slides": [{ "title": "...", "content": "..." }] }.
      Do not include markdown code fences (\`\`\`json ... \`\`\`) in the JSON response, only the raw JSON object.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
        }
    });

    try {
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);
        if (parsed.title && Array.isArray(parsed.slides)) {
            return parsed;
        }
        throw new Error("Invalid JSON structure from AI");
    } catch (error) {
        console.error("Failed to parse AI response for pitch deck:", error, response.text);
        throw new Error("The AI failed to generate a valid pitch deck. Please try refining your idea and generating again.");
    }
};

export const generateProjectIdea = async (): Promise<any> => {
    const model = 'gemini-2.5-pro';
    const prompt = `
      You are an expert business analyst and startup consultant specializing in micro-enterprises for the Zimbabwean market, operating within the framework of the Ubuntium Global Commons philosophy ("I am because we are"). Your goal is to generate a viable, small-scale project idea with a startup cost between $200 and $500 that can be launched by a member of the commons.
  
      The project must be essential, highly needed by the local community, and designed to generate profit while also feeding value back into the commons.
  
      Employ systems thinking to analyze how the project interacts with the local economy and the commons. Use first-principles thinking to break down the business into its most fundamental components.
  
      Provide a detailed analysis in a single JSON object. Do not include markdown code fences.
    `;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            projectName: { type: Type.STRING },
            justification: {
                type: Type.OBJECT,
                properties: {
                    opportunity: { type: Type.STRING, description: "Detailed explanation of why this project is a significant opportunity in Zimbabwe right now, citing specific market needs, gaps, or trends. Be logical and provide strong reasoning." },
                    dataBackedReasoning: { type: Type.STRING, description: "Provide data points or logical deductions to support the opportunity. E.g., 'With over 60% of households experiencing power cuts, demand for alternative lighting is high.'" }
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
            timeline: {
                type: Type.OBJECT,
                properties: {
                    setup: { type: Type.STRING },
                    launch: { type: Type.STRING }
                },
                required: ["setup", "launch"]
            },
            financials: {
                type: Type.OBJECT,
                properties: {
                    pricingStrategy: { type: Type.STRING },
                    breakEvenAnalysis: { type: Type.STRING }
                },
                required: ["pricingStrategy", "breakEvenAnalysis"]
            },
            commonsFeedbackLoop: { type: Type.STRING, description: "Explain how this project strengthens the Ubuntium Global Commons." },
            externalResources: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        url: { type: Type.STRING }
                    },
                    required: ["title", "url"]
                }
            }
        },
        required: [
            "projectName", "justification", "requirements", "budgetBreakdown",
            "totalEstimatedCost", "executionPlan", "timeline", "financials",
            "commonsFeedbackLoop", "externalResources"
        ]
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse AI response for project idea:", error);
        throw new Error("The AI failed to generate a project idea. Please try again.");
    }
};
