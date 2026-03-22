
import { User } from '../types';
import { safeJsonStringify } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  widget?: any; // For UI components rendered in chat
  widgets?: any[]; // For multiple widgets in a single response
}

const GEMINI_MODEL = "gemini-3-flash-preview";

export const agentService = {
  async chat(messages: AgentMessage[], tools?: any[]) {
    // Strip non-serializable properties like 'widget' and 'widgets' before sending to API
    const serializableMessages = messages.map(({ widget, widgets, ...rest }) => rest);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeJsonStringify({ messages: serializableMessages, tools }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Failed to parse Agent response:', text);
        throw new Error('Agent returned an invalid response format.');
      }

      if (response.ok) {
        if (!data.choices || data.choices.length === 0) {
          console.error('Unexpected Agent Response:', data);
          throw new Error('Agent returned an empty or invalid response.');
        }
        return data;
      }

      // If server-side chat fails, we'll try Gemini fallback below
      console.warn('Server-side chat failed, attempting Gemini fallback...', data.error);
    } catch (error) {
      console.warn('Server-side chat failed with network error, attempting Gemini fallback...', error);
    }

    // FALLBACK: Direct Gemini API call from frontend
    return await this.geminiFallback(messages, tools);
  },

  async geminiFallback(messages: AgentMessage[], tools?: any[]) {
    console.log('Using Gemini fallback...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No AI service available. Please configure OpenRouter or Gemini API keys.');
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const parts: any[] = [];
        if (m.content) parts.push({ text: m.content });
        
        if (m.tool_calls) {
          m.tool_calls.forEach(tc => {
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments)
              }
            });
          });
        }

        if (m.role === 'tool') {
          parts.push({
            functionResponse: {
              name: m.name || '',
              response: { result: m.content }
            }
          });
        }

        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

    // Convert tools to Gemini format
    const geminiTools = tools ? [{
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      }))
    }] : undefined;

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: chatMessages,
        config: {
          systemInstruction,
          tools: geminiTools as any,
        }
      });

      const candidate = response.candidates?.[0];
      if (!candidate || !candidate.content) throw new Error('Gemini returned no response content');

      const parts = candidate.content.parts;
      if (!parts) throw new Error('Gemini returned no response parts');

      const textPart = parts.find(p => p.text);
      const functionCallParts = parts.filter(p => p.functionCall);

      const tool_calls = functionCallParts.map(p => ({
        id: `call_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function',
        function: {
          name: p.functionCall!.name,
          arguments: JSON.stringify(p.functionCall!.args)
        }
      }));

      return {
        choices: [{
          message: {
            role: 'assistant',
            content: textPart?.text || '',
            tool_calls: tool_calls.length > 0 ? tool_calls : undefined
          }
        }]
      };
    } catch (error: any) {
      console.error('Gemini Fallback Error:', error);
      throw new Error(`AI communication failed: ${error.message}`);
    }
  },

  getProtocolSystemInstruction(user: User) {
    return `You are the "Commons Brain", the core agentic operating system of the Ubuntium Global Commons (UGC).
Your mission is to facilitate the growth of the Commons by assisting members with protocol knowledge, financial transactions, and cryptographic node management.

CORE PROTOCOL KNOWLEDGE:
- $UBT (Ubuntium): The primary medium of exchange. It represents shared value and commitment.
- UBT Address: A cryptographic public key (prefixed with 'UBT-') that identifies a node in the Commons.
- Public Ledger: A global, immutable record of all UBT transactions.
- Node Security: Every member's node is anchored by a non-custodial cryptographic vault.

YOUR CAPABILITIES:
- You can check wallet balances and node addresses using 'get_wallet_balance'.
- You can provide the user's receive address (public key) using 'get_receive_address'.
- You can dispatch $UBT to other node addresses or emails using 'send_ubt'.
- You can view the global 'get_public_ledger' to see all protocol activity.
- You can check the 'get_security_status' of the user's node (vault status, key anchors).
- You can search the Commons Registry for members and ventures using 'search_commons_registry'.
- You can monitor the Zim Pulse for the latest updates using 'get_zim_pulse'.

OPERATING PRINCIPLES:
1. EVERYTHING IN CHAT: All wallet operations, balance checks, and address sharing MUST happen directly in the chat via widgets. Do not refer the user to a separate dashboard.
2. CRYPTOGRAPHIC FOCUS: Emphasize UBT addresses (public keys) over internal User IDs. Every account is anchored to its own cryptography.
3. PUBLIC LEDGER: Remind users that all transactions are public and immutable on the Commons Ledger.
4. BE PROACTIVE: If a user checks their balance and it's high, suggest contributing to a trending venture from the Zim Pulse.
5. BE CONCISE: Use clear, impactful language.
6. BE AGENTIC: Don't just answer questions; offer to perform actions. Instead of saying "You can send UBT", say "I can dispatch that UBT for you now. What is the recipient's UBT address or email?"
7. CONFIRM SENSITIVE ACTIONS: Before executing 'send_ubt', summarize the transaction (amount, recipient) and ask for a final "Yes" or confirmation if the user hasn't explicitly authorized it in the current context.

CURRENT CONTEXT:
- User Name: ${user.name}
- User ID: ${user.id}
- Node Address: ${user.publicKey || 'GENESIS_NODE'}
- User Role: ${user.role}
- User Balance: ${user.ubtBalance || 0} UBT

Always maintain the persona of a highly intelligent, protocol-aligned digital brain.`;
  }
};
