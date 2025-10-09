#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TYPES } from 'tedious';
import dotenv from 'dotenv';
import { Database } from './db.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'USER_ID'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Error: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

// Initialize database
const db = new Database({
  server: process.env.DB_SERVER!,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
});

const userId = process.env.USER_ID!;

// Define tools
const tools: Tool[] = [
  {
    name: 'save_conversation',
    description: 'Save a conversation to TaskMaster database',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Conversation title',
        },
        messages: {
          type: 'array',
          description: 'Array of message objects with role, content, and timestamp',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
              timestamp: { type: 'string' },
            },
            required: ['role', 'content'],
          },
        },
      },
      required: ['title', 'messages'],
    },
  },
  {
    name: 'search_conversations',
    description: 'Search conversations in TaskMaster database',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_conversation',
    description: 'Get a specific conversation with all messages',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'number',
          description: 'Conversation ID',
        },
      },
      required: ['conversationId'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'taskmaster-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handler for calling tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'save_conversation': {
        const { title, messages } = args as {
          title: string;
          messages: Array<{ role: string; content: string; timestamp?: string }>;
        };

        // Generate external ID
        const externalId = `claude-desktop-${Date.now()}`;
        const messagesJson = JSON.stringify(messages);

        console.error(`Saving conversation: ${title}`);

        // Call stored procedure
        const result = await db.executeProcedure(
          'sp_SaveConversation',
          [
            { name: 'Source', type: TYPES.NVarChar, value: 'ClaudeDesktop' },
            { name: 'ExternalId', type: TYPES.NVarChar, value: externalId },
            { name: 'UserId', type: TYPES.NVarChar, value: userId },
            { name: 'Title', type: TYPES.NVarChar, value: title },
            { name: 'MessagesJson', type: TYPES.NVarChar, value: messagesJson },
          ],
        );

        const conversationId = result.output.ConversationId || result.results[0]?.Id;

        console.error(`Conversation saved with ID: ${conversationId}`);

        return {
          content: [
            {
              type: 'text',
              text: `Conversation saved successfully with ID: ${conversationId}`,
            },
          ],
        };
      }

      case 'search_conversations': {
        const { query, limit = 10 } = args as { query: string; limit?: number };

        console.error(`Searching conversations with query: ${query}`);

        const searchQuery = `%${query}%`;

        const results = await db.executeQuery(
          `SELECT TOP (@Limit)
            c.Id,
            c.Title,
            c.Source,
            c.CreatedAt,
            c.UpdatedAt,
            (SELECT COUNT(*) FROM Messages WHERE ConversationId = c.Id) AS MessageCount
          FROM Conversations c
          WHERE c.UserId = @UserId
            AND c.IsActive = 1
            AND (c.Title LIKE @Query
              OR EXISTS (
                SELECT 1 FROM Messages m
                WHERE m.ConversationId = c.Id
                  AND m.Content LIKE @Query
              ))
          ORDER BY c.UpdatedAt DESC`,
          [
            { name: 'Limit', type: TYPES.Int, value: limit },
            { name: 'UserId', type: TYPES.NVarChar, value: userId },
            { name: 'Query', type: TYPES.NVarChar, value: searchQuery },
          ]
        );

        console.error(`Found ${results.length} conversations`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_conversation': {
        const { conversationId } = args as { conversationId: number };

        console.error(`Getting conversation: ${conversationId}`);

        // Get conversation details
        const conversations = await db.executeQuery(
          `SELECT Id, Title, Source, CreatedAt, UpdatedAt, ExternalId
          FROM Conversations
          WHERE Id = @ConversationId AND UserId = @UserId AND IsActive = 1`,
          [
            { name: 'ConversationId', type: TYPES.Int, value: conversationId },
            { name: 'UserId', type: TYPES.NVarChar, value: userId },
          ]
        );

        if (conversations.length === 0) {
          throw new Error(`Conversation ${conversationId} not found or access denied`);
        }

        // Get messages
        const messages = await db.executeQuery(
          `SELECT Id, Role, Content, CreatedAt
          FROM Messages
          WHERE ConversationId = @ConversationId
          ORDER BY CreatedAt ASC`,
          [{ name: 'ConversationId', type: TYPES.Int, value: conversationId }]
        );

        const result = {
          conversation: conversations[0],
          messages,
        };

        console.error(`Retrieved conversation with ${messages.length} messages`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  console.error('Starting TaskMaster MCP Server...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('TaskMaster MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
