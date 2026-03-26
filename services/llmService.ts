import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: any[];
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
  tools?: any[];
  timeout?: number;
  retries?: number;
}

const DEFAULT_MODELS = [
  "google/gemini-2.0-flash-001",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku-20240307"
];

export const llmService = {
  async chat(messages: Message[], options: LLMOptions = {}) {
    const {
      temperature = 0.7,
      max_tokens = 4096,
      jsonMode = false,
      tools = [],
      timeout = 20000, // 20 seconds per attempt
      retries = 0 // 0 retries per model (just try once)
    } = options;

    const GLOBAL_RETRIES = 1; // Retry the entire process once if it fails
    let lastError: any = null;

    for (let globalAttempt = 0; globalAttempt <= GLOBAL_RETRIES; globalAttempt++) {
      try {
        console.log(`LLM: Chat request received (Global Attempt ${globalAttempt + 1}). Messages: ${messages.length}, Tools: ${tools.length}, JSON Mode: ${jsonMode}`);
        
        const startTime = Date.now();
        const GLOBAL_TIMEOUT = 45000; // 45 seconds total for all attempts to stay under infrastructure limits (usually 60s)

        // 1. Try OpenRouter
        if (OPENROUTER_API_KEY) {
          const models = options.model ? [options.model] : DEFAULT_MODELS;
          
          for (const model of models) {
            if (Date.now() - startTime > GLOBAL_TIMEOUT) {
              console.warn("LLM: Global timeout reached during OpenRouter attempts.");
              break;
            }

            for (let attempt = 0; attempt <= retries; attempt++) {
              if (Date.now() - startTime > GLOBAL_TIMEOUT) break;
              try {
                console.log(`LLM: Attempting OpenRouter with model ${model} (Attempt ${attempt + 1})...`);
                const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                  model,
                  messages,
                  tools: tools.length > 0 ? tools : undefined,
                  tool_choice: tools.length > 0 ? "auto" : undefined,
                  max_tokens,
                  temperature,
                  response_format: jsonMode ? { type: "json_object" } : undefined
                }, {
                  headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://ubuntium.org",
                    "X-Title": "Ubuntium Global Commons",
                  },
                  timeout,
                  validateStatus: () => true
                });

                if (response.status === 200) {
                  const data = response.data;
                  if (data.choices && data.choices.length > 0) {
                    console.log(`LLM: Success with OpenRouter model ${model}`);
                    return data;
                  }
                }

                const errorData = response.data;
                console.error(`LLM: OpenRouter Error (${model}, Attempt ${attempt + 1}):`, errorData);
                lastError = errorData;

                if (response.status === 401) break; // Don't retry on auth error
                if (response.status === 429) {
                    // Rate limit, wait a bit before retry
                    await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
                    continue;
                }

              } catch (error: any) {
                console.error(`LLM: OpenRouter Fetch Error (${model}, Attempt ${attempt + 1}):`, error.message);
                lastError = error;
              }
            }
          }
        }

        // 2. Try NVIDIA Fallback (Only if no tools are required, as NVIDIA implementation here doesn't support tools)
        if (NVIDIA_API_KEY && tools.length === 0 && Date.now() - startTime < GLOBAL_TIMEOUT) {
          for (let attempt = 0; attempt <= retries; attempt++) {
            if (Date.now() - startTime > GLOBAL_TIMEOUT) break;
            try {
              console.log(`LLM: Attempting NVIDIA fallback (Attempt ${attempt + 1})...`);
              const response = await axios.post("https://integrate.api.nvidia.com/v1/chat/completions", {
                model: "moonshotai/kimi-k2.5",
                messages,
                max_tokens,
                temperature
              }, {
                headers: {
                  "Authorization": `Bearer ${NVIDIA_API_KEY}`,
                  "Content-Type": "application/json",
                },
                timeout: 25000,
                validateStatus: () => true
              });

              if (response.status === 200) {
                const data = response.data;
                if (data.choices && data.choices.length > 0) {
                  console.log("LLM: Success with NVIDIA");
                  return data;
                }
              }
              lastError = response.data;
            } catch (error: any) {
              console.error(`LLM: NVIDIA Error (Attempt ${attempt + 1}):`, error.message);
              lastError = error;
            }
          }
        }

        // 3. Try Gemini Fallback
        if (genAI && Date.now() - startTime < GLOBAL_TIMEOUT) {
          try {
            console.log("LLM: Falling back to direct Gemini...");
            
            const systemMessage = messages.find(m => m.role === "system");
            const chatContents = messages
              .filter(m => m.role !== "system")
              .map(m => {
                const parts: any[] = [];
                if (m.content) parts.push({ text: m.content });
                
                if (m.tool_calls) {
                  m.tool_calls.forEach(tc => {
                    parts.push({
                      functionCall: {
                        name: tc.function.name,
                        args: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
                      }
                    });
                  });
                }

                if (m.role === "tool") {
                  parts.push({
                    functionResponse: {
                      name: m.name || "",
                      response: { result: m.content }
                    }
                  });
                }

                return {
                  role: m.role === "assistant" ? "model" : "user",
                  parts
                };
              });

            if (chatContents.length === 0) {
              chatContents.push({ role: "user", parts: [{ text: "Hello" }] });
            }

            const geminiTools = tools.length > 0 ? [{
              functionDeclarations: tools.map(t => ({
                name: t.function.name,
                description: t.function.description,
                parameters: t.function.parameters
              }))
            }] : undefined;

            const geminiPromise = genAI.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: chatContents,
              config: {
                systemInstruction: systemMessage?.content || "You are a helpful assistant.",
                responseMimeType: jsonMode ? "application/json" : "text/plain",
                temperature,
                maxOutputTokens: max_tokens,
                tools: geminiTools as any
              }
            });

            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Gemini request timed out")), 30000)
            );

            const response = await Promise.race([geminiPromise, timeoutPromise]) as any;

            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content) throw new Error('Gemini returned no response content');

            const parts = candidate.content.parts;
            if (!parts) throw new Error('Gemini returned no response parts');

            const textPart = parts.find((p: any) => p.text);
            const functionCallParts = parts.filter((p: any) => p.functionCall);

            const tool_calls = functionCallParts.map((p: any) => ({
              id: `call_${Math.random().toString(36).substr(2, 9)}`,
              type: 'function',
              function: {
                name: p.functionCall!.name,
                arguments: JSON.stringify(p.functionCall!.args)
              }
            }));

            console.log("LLM: Success with Gemini");
            
            // Mock OpenAI response format for consistency
            return {
              choices: [{
                message: {
                  role: "assistant",
                  content: textPart?.text || "",
                  tool_calls: tool_calls.length > 0 ? tool_calls : undefined
                },
                finish_reason: tool_calls.length > 0 ? "tool_calls" : "stop"
              }]
            };
          } catch (error: any) {
            console.error("LLM: Gemini Fallback Error:", error.message);
            lastError = error;
          }
        }

        const errorDetails = lastError instanceof Error ? lastError.message : (typeof lastError === 'object' ? JSON.stringify(lastError).substring(0, 500) : String(lastError));
        console.warn(`LLM: Global attempt ${globalAttempt + 1} failed: ${errorDetails}`);
        
        if (globalAttempt < GLOBAL_RETRIES) {
          console.log("LLM: Retrying entire chat process...");
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before global retry
          continue;
        }
        
        throw new Error(`LLM: All providers failed after ${GLOBAL_RETRIES + 1} global attempts. Last error: ${errorDetails}`);
      } catch (error: any) {
        if (globalAttempt < GLOBAL_RETRIES) {
          console.warn(`LLM: Caught error in global attempt ${globalAttempt + 1}, retrying...`, error.message);
          continue;
        }
        throw error;
      }
    }
    throw new Error("LLM: Unexpected end of chat function");
  },

  async generateJSON(prompt: string, systemInstruction: string = "", options: LLMOptions = {}) {
    const messages: Message[] = [
      { role: "system", content: systemInstruction || "You are a helpful AI assistant that responds ONLY with valid JSON." },
      { role: "user", content: prompt }
    ];

    const response = await this.chat(messages, { ...options, jsonMode: true });
    const content = response.choices[0].message.content;

    try {
      // Clean up potential markdown code blocks
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(cleanJson);
      } catch (innerError) {
        // Aggressive extraction
        const start = cleanJson.indexOf('{');
        const end = cleanJson.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const extracted = cleanJson.substring(start, end + 1);
          return JSON.parse(extracted);
        }
        throw innerError;
      }
    } catch (e) {
      console.error("LLM: Failed to parse JSON from content:", content);
      throw new Error("Invalid JSON format from LLM");
    }
  }
};
