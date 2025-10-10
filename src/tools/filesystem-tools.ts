import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const filesystemTools: Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to read',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory',
    inputSchema: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: 'Path to the directory to list',
        },
      },
      required: ['dirPath'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern',
    inputSchema: {
      type: 'object',
      properties: {
        searchPath: {
          type: 'string',
          description: 'Path to search in',
        },
        pattern: {
          type: 'string',
          description: 'Search pattern to match',
        },
      },
      required: ['searchPath', 'pattern'],
    },
  },
  {
    name: 'create_directory',
    description: 'Create a new directory',
    inputSchema: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: 'Path to the directory to create',
        },
      },
      required: ['dirPath'],
    },
  },
  {
    name: 'get_file_info',
    description: 'Get information about a file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to delete',
        },
        confirm: {
          type: 'boolean',
          description: 'Confirmation to delete the file',
        },
      },
      required: ['filePath', 'confirm'],
    },
  },
];
