import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const conversationTools: Tool[] = [
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
