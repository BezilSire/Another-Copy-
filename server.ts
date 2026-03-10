import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { api } from "./services/apiService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
            content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
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
            timestamp: Date.now(),
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
