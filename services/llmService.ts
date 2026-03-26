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
  "openrouter/auto",
  "qwen/qwen-2.5-72b-instruct",
  "google/gemini-2.0-flash-001",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku"
];

export const llmService = {
  async chat(messages: Message[], options: LLMOptions = {}) {
    const {
      temperature = 0.7,
      max_tokens = 4096,
      jsonMode = false,
      tools = [],
      timeout = 30000, // 30 seconds default
      retries = 2
    } = options;

    let lastError: any = null;

    // 1. Try OpenRouter
    if (OPENROUTER_API_KEY) {
      const models = options.model ? [options.model] : DEFAULT_MODELS;
      
      for (const model of models) {
        for (let attempt = 0; attempt <= retries; attempt++) {
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

    // 2. Try NVIDIA Fallback
    if (NVIDIA_API_KEY) {
      for (let attempt = 0; attempt <= retries; attempt++) {
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
            timeout: 20000,
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
    if (genAI) {
      try {
        console.log("LLM: Falling back to direct Gemini...");
        
        const systemMessage = messages.find(m => m.role === "system");
        const chatContents = messages
          .filter(m => m.role !== "system")
          .map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }));

        if (chatContents.length === 0) {
          chatContents.push({ role: "user", parts: [{ text: "Hello" }] });
        }

        const response = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: chatContents,
          config: {
            systemInstruction: systemMessage?.content || "You are a helpful assistant.",
            responseMimeType: jsonMode ? "application/json" : "text/plain",
            temperature,
            maxOutputTokens: max_tokens
          }
        });

        const text = response.text || "";
        console.log("LLM: Success with Gemini");
        
        // Mock OpenAI response format for consistency
        return {
          choices: [{
            message: {
              role: "assistant",
              content: text
            },
            finish_reason: "stop"
          }]
        };
      } catch (error: any) {
        console.error("LLM: Gemini Fallback Error:", error.message);
        lastError = error;
      }
    }

    throw new Error(`LLM: All providers failed. Last error: ${JSON.stringify(lastError)}`);
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
