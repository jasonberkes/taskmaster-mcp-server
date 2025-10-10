import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const sqlTools: Tool[] = [
  {
    name: 'sql_execute_query',
    description: 'Execute a SQL query on the TaskMaster database. Supports SELECT, INSERT, UPDATE, DELETE, etc. Use readOnly=true for safe SELECT queries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query to execute',
        },
        readOnly: {
          type: 'boolean',
          description: 'If true, only SELECT queries are allowed (default: false)',
          default: false,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'sql_list_tables',
    description: 'List all tables in the database with row counts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'sql_table_exists',
    description: 'Check if a table exists in the database',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Name of the table to check',
        },
        schema: {
          type: 'string',
          description: 'Schema name (default: dbo)',
          default: 'dbo',
        },
      },
      required: ['tableName'],
    },
  },
  {
    name: 'sql_get_table_schema',
    description: 'Get detailed schema information for a table including columns, data types, and constraints',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Name of the table',
        },
        schema: {
          type: 'string',
          description: 'Schema name (default: dbo)',
          default: 'dbo',
        },
      },
      required: ['tableName'],
    },
  },
  {
    name: 'sql_drop_table',
    description: 'Drop a table from the database. DESTRUCTIVE OPERATION - requires confirm=true',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Name of the table to drop',
        },
        schema: {
          type: 'string',
          description: 'Schema name (default: dbo)',
          default: 'dbo',
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm this destructive operation',
        },
      },
      required: ['tableName', 'confirm'],
    },
  },
  {
    name: 'sql_apply_schema_file',
    description: 'Apply a SQL schema file with GO batch support and optional transaction wrapping. Automatically handles batch parsing and error reporting.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the SQL schema file',
        },
        useTransaction: {
          type: 'boolean',
          description: 'Wrap all batches in a transaction and rollback on error (default: true)',
          default: true,
        },
      },
      required: ['filePath'],
    },
  },
];
