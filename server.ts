import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { api } from "./services/apiService";
import { serverTimestamp } from "firebase/firestore";
import { whatsappService } from "./services/whatsappService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // WhatsApp Service Setup
  const AUTH_PATH = path.join(process.cwd(), 'wa_auth');
  if (fs.existsSync(AUTH_PATH)) {
    const sessions = fs.readdirSync(AUTH_PATH);
    for (const userId of sessions) {
      if (fs.statSync(path.join(AUTH_PATH, userId)).isDirectory()) {
        whatsappService.init(userId).catch(err => console.error(`WhatsApp Init Error for ${userId}:`, err));
      }
    }
  }

  const SERVER_TOOLS = [
    {
      name: "get_wallet_balance",
      description: "Get the current UBT balance for the user.",
      parameters: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] }
    },
    {
      name: "search_users",
      description: "Search for other members in the Ubuntium Global Commons.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    },
    {
      name: "get_zim_pulse",
      description: "Get the latest intelligence feed from the Zim Pulse.",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "get_receive_address",
      description: "Get the user's public key (node address) to receive UBT assets.",
      parameters: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] }
    },
    {
      name: "get_public_ledger",
      description: "View the global public ledger of all UBT transactions in the Commons.",
      parameters: { type: "object", properties: { limit: { type: "number", description: "Number of transactions to show." } } }
    }
  ];

  const executeServerTool = async (name: string, args: any) => {
    switch (name) {
      case "get_wallet_balance": {
        const user = await api.getUser(args.userId);
        return `Balance for ${user.name}: ${user.ubtBalance || 0} UBT. Node Address: ${user.publicKey || 'GENESIS'}`;
      }
      case "search_users": {
        const users = await api.searchUsers(args.query, { id: args.userId } as any);
        return JSON.stringify(users.map(u => ({ name: u.name, bio: u.bio, id: u.id })));
      }
      case "get_zim_pulse": {
        const pulse = await new Promise<any[]>((resolve) => {
          const unsub = api.listenForZimPulse((data) => {
            unsub();
            resolve(data);
          });
        });
        return JSON.stringify(pulse.slice(0, 3));
      }
      case "get_receive_address": {
        const user = await api.getUser(args.userId);
        return `Your Node Address (Public Key) is: ${user.publicKey || 'GENESIS'}`;
      }
      case "get_public_ledger": {
        const ledger = await api.getPublicLedger(args.limit || 5);
        return JSON.stringify(ledger);
      }
      default:
        return "Tool not implemented on server.";
    }
  };

  whatsappService.onMessage(async (userId, msg) => {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    const from = msg.key.remoteJid;

    if (text && from) {
      console.log(`WhatsApp [User: ${userId}]: Received message from ${from}: ${text}`);
      
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return;

      try {
        let messages = [
          { role: "system", content: `You are the Ubuntium Commons Brain, an AI assistant for the Ubuntium Global Commons. You help users manage their UBT assets, search the registry, and stay updated on the Zim Pulse. Use tools when necessary. The current user's ID is ${userId}.` },
          { role: "user", content: text }
        ];

        let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ubuntium.org",
            "X-Title": "Ubuntium Global Commons",
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-72b-instruct",
            messages,
            tools: SERVER_TOOLS.map(t => ({ type: "function", function: t })),
            tool_choice: "auto",
          }),
        });

        if (response.ok) {
          let data = await response.json();
          let assistantMessage = data.choices?.[0]?.message;

          if (assistantMessage?.tool_calls) {
            messages.push(assistantMessage);
            for (const toolCall of assistantMessage.tool_calls) {
              const result = await executeServerTool(toolCall.function.name, { ...JSON.parse(toolCall.function.arguments), userId });
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: result
              } as any);
            }

            // Get final response
            const finalResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ubuntium.org",
                "X-Title": "Ubuntium Global Commons",
              },
              body: JSON.stringify({
                model: "qwen/qwen-2.5-72b-instruct",
                messages,
              }),
            });

            if (finalResponse.ok) {
              const finalData = await finalResponse.json();
              const reply = finalData.choices?.[0]?.message?.content;
              if (reply) {
                await whatsappService.sendMessage(userId, from, reply);
              }
            } else {
              console.error("OpenRouter Final Response Error:", await finalResponse.text());
            }
          } else if (assistantMessage?.content) {
            await whatsappService.sendMessage(userId, from, assistantMessage.content);
          }
        } else {
          console.error("OpenRouter Response Error:", await response.text());
        }
      } catch (err) {
        console.error("WhatsApp Agent Error:", err);
      }
    }
  });

  // WhatsApp Endpoints
  app.get("/api/whatsapp/status", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });
    res.json(whatsappService.getStatus(userId));
  });

  app.post("/api/whatsapp/logout", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await whatsappService.logout(userId);
    res.json({ success: true });
  });

  app.post("/api/whatsapp/init", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await whatsappService.init(userId);
    res.json({ success: true });
  });

  // MCP Server Setup
  const mcpServer = new Server(
    {
      name: "ubuntium-global-commons",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define MCP Tools
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_balance",
          description: "Get the UBT balance for a specific user node",
          inputSchema: {
            type: "object",
            properties: {
              userId: { type: "string", description: "The ID of the user node" },
            },
            required: ["userId"],
          },
        },
        {
          name: "search_users",
          description: "Search for user nodes by name or email",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
            },
            required: ["query"],
          },
        },
        {
          name: "dispatch_ubt",
          description: "Dispatch UBT assets from one node to another (Requires Admin or System privileges)",
          inputSchema: {
            type: "object",
            properties: {
              senderId: { type: "string" },
              receiverId: { type: "string" },
              amount: { type: "number" },
              memo: { type: "string" },
            },
            required: ["senderId", "receiverId", "amount"],
          },
        },
        {
          name: "reconcile_balances",
          description: "Trigger a global balance reconciliation across all nodes",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_balance": {
          const userId = args?.userId as string;
          const user = await api.getUser(userId);
          return {
            content: [{ type: "text", text: `Balance for ${user?.name || userId}: ${user?.ubtBalance || 0} UBT` }],
          };
        }
        case "search_users": {
          const query = args?.query as string;
          const users = await api.searchUsers(query, { id: '' } as any);
          return {
            content: [{ type: "text", text: api.safeJsonStringify(users) }],
          };
        }
        case "reconcile_balances": {
          await api.reconcileAllBalances();
          return {
            content: [{ type: "text", text: "Global balance reconciliation completed successfully." }],
          };
        }
        case "dispatch_ubt": {
          const { senderId, receiverId, amount, memo } = args as any;
          
          const tx = {
            id: `mcp_${Date.now()}`,
            senderId,
            receiverId,
            amount,
            timestamp: serverTimestamp(),
            type: 'TRANSFER',
            protocol_mode: 'DIRECT',
            memo: memo || 'MCP Dispatch',
            participants: [senderId, receiverId],
            signature: 'mcp_signed',
            hash: `hash_${Math.random()}`,
            nonce: Date.now(),
            senderPublicKey: 'MCP_NODE'
          };

          await api.processUbtTransaction(tx as any);
          return {
            content: [{ type: "text", text: `Successfully dispatched ${amount} UBT from ${senderId} to ${receiverId}.` }],
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  // SSE Transport for MCP
  let transport: SSEServerTransport | null = null;

  app.get("/mcp", async (req: Request, res: Response) => {
    console.log("MCP: New SSE connection");
    transport = new SSEServerTransport("/mcp/messages", res);
    await mcpServer.connect(transport);
  });

  app.post("/mcp/messages", async (req: Request, res: Response) => {
    console.log("MCP: Received message");
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send("No active transport");
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const { messages, tools } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY not configured on server" });
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ubuntium.org",
          "X-Title": "Ubuntium Global Commons",
        },
        body: JSON.stringify({
          model: "qwen/qwen-2.5-72b-instruct",
          messages,
          tools: tools || [],
          tool_choice: tools ? "auto" : undefined,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter Error Response:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          return res.status(response.status).json(errorData);
        } catch {
          return res.status(response.status).json({ error: errorText });
        }
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("OpenRouter Fetch Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite Middleware for Development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
  });
}

startServer();
