#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TYPES } from 'tedious';
import dotenv from 'dotenv';
import { Database } from './db.js';
import * as FileSystem from './filesystem.js';
import * as GitHub from './github-module.js';
import * as Commands from './commands-module.js';
import * as SqlHandlers from './tools/sql-handlers.js';

// Import tool definitions
import { conversationTools } from './tools/conversation-tools.js';
import { filesystemTools } from './tools/filesystem-tools.js';
import { githubTools } from './tools/github-tools.js';
import { commandTools } from './tools/command-tools.js';
import { sqlTools } from './tools/sql-tools.js';

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

// Initialize GitHub if token is provided
if (process.env.GITHUB_TOKEN) {
  GitHub.initializeGitHub(process.env.GITHUB_TOKEN);
}

// SQL config for handlers
const sqlConfig: SqlHandlers.SqlConfig = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
};

// Combine all tools
const tools = [
  ...conversationTools,
  ...filesystemTools,
  ...githubTools,
  ...commandTools,
  ...sqlTools,
];

// Create server
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

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Conversation tools
      case 'save_conversation': {
        const { conversationUri, title, messages } = args as {
          conversationUri?: string;
          title: string;
          messages: Array<{ role: string; content: string; timestamp?: string }>;
        };
        // Use conversation URI if provided, otherwise generate unique ID
        const externalId = conversationUri || `claude-desktop-${Date.now()}`;
        const messagesJson = JSON.stringify(messages);
        console.error(`Saving conversation: ${title}`);
        const result = await db.executeProcedure('sp_SaveConversation', [
          { name: 'Source', type: TYPES.NVarChar, value: 'ClaudeDesktop' },
          { name: 'ExternalId', type: TYPES.NVarChar, value: externalId },
          { name: 'UserId', type: TYPES.NVarChar, value: userId },
          { name: 'Title', type: TYPES.NVarChar, value: title },
          { name: 'MessagesJson', type: TYPES.NVarChar, value: messagesJson },
        ]);
        const conversationId = result.output.ConversationId || result.results[0]?.Id;
        console.error(`Conversation saved with ID: ${conversationId}`);
        return {
          content: [
            { type: 'text', text: `Conversation saved successfully with ID: ${conversationId}` },
          ],
        };
      }

      case 'search_conversations': {
        const { query, limit = 10 } = args as { query: string; limit?: number };
        console.error(`Searching conversations for: ${query}`);
        const results = await db.executeQuery<any>(
          `SELECT TOP (@limit) c.Id, c.Title, c.CreatedAt, c.UpdatedAt,
            (SELECT COUNT(*) FROM Messages WHERE ConversationId = c.Id) AS MessageCount
           FROM Conversations c
           WHERE c.UserId = @userId AND c.IsActive = 1 
             AND (c.Title LIKE @searchPattern OR EXISTS (
               SELECT 1 FROM Messages m 
               WHERE m.ConversationId = c.Id AND m.Content LIKE @searchPattern
             ))
           ORDER BY c.UpdatedAt DESC`,
          [
            { name: 'limit', type: TYPES.Int, value: limit },
            { name: 'userId', type: TYPES.NVarChar, value: userId },
            { name: 'searchPattern', type: TYPES.NVarChar, value: `%${query}%` },
          ]
        );
        console.error(`Found ${results.length} conversations`);
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
      }

      case 'get_conversation': {
        const { conversationId } = args as { conversationId: number };
        console.error(`Getting conversation: ${conversationId}`);
        const conversation = await db.executeQuery<any>(
          `SELECT Id, Title, Source, CreatedAt, UpdatedAt FROM Conversations 
           WHERE Id = @conversationId AND UserId = @userId AND IsActive = 1`,
          [
            { name: 'conversationId', type: TYPES.Int, value: conversationId },
            { name: 'userId', type: TYPES.NVarChar, value: userId },
          ]
        );
        if (conversation.length === 0) {
          throw new Error('Conversation not found');
        }
        const messages = await db.executeQuery<any>(
          `SELECT Id, Role, Content, CreatedAt FROM Messages 
           WHERE ConversationId = @conversationId ORDER BY CreatedAt ASC`,
          [{ name: 'conversationId', type: TYPES.Int, value: conversationId }]
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ conversation: conversation[0], messages }, null, 2),
            },
          ],
        };
      }

      // Filesystem tools
      case 'read_file': {
        const { filePath } = args as { filePath: string };
        console.error(`Reading file: ${filePath}`);
        const content = await FileSystem.readFile(filePath);
        return {
          content: [{ type: 'text', text: content }],
        };
      }

      case 'write_file': {
        const { filePath, content } = args as { filePath: string; content: string };
        console.error(`Writing file: ${filePath}`);
        await FileSystem.writeFile(filePath, content);
        return {
          content: [{ type: 'text', text: `File written successfully: ${filePath}` }],
        };
      }

      case 'list_directory': {
        const { dirPath } = args as { dirPath: string };
        console.error(`Listing directory: ${dirPath}`);
        const entries = await FileSystem.listDirectory(dirPath);
        return {
          content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }],
        };
      }

      case 'search_files': {
        const { searchPath, pattern } = args as { searchPath: string; pattern: string };
        console.error(`Searching files in ${searchPath} for: ${pattern}`);
        const results = await FileSystem.searchFiles(searchPath, pattern);
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
      }

      case 'create_directory': {
        const { dirPath } = args as { dirPath: string };
        console.error(`Creating directory: ${dirPath}`);
        await FileSystem.createDirectory(dirPath);
        return {
          content: [{ type: 'text', text: `Directory created successfully: ${dirPath}` }],
        };
      }

      case 'get_file_info': {
        const { filePath } = args as { filePath: string };
        console.error(`Getting file info: ${filePath}`);
        const info = await FileSystem.getFileInfo(filePath);
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
        };
      }

      case 'delete_file': {
        const { filePath, confirm } = args as { filePath: string; confirm: boolean };
        if (!confirm) {
          throw new Error('File deletion requires confirmation (confirm parameter must be true)');
        }
        console.error(`Deleting file: ${filePath}`);
        await FileSystem.deleteFile(filePath);
        return {
          content: [{ type: 'text', text: `File deleted successfully: ${filePath}` }],
        };
      }

      // GitHub tools
      case 'github_create_repo': {
        const { name, description, private: isPrivate, autoInit } = args as {
          name: string;
          description?: string;
          private?: boolean;
          autoInit?: boolean;
        };
        console.error(`Creating GitHub repository: ${name}`);
        const result = await GitHub.createRepo(name, { description, private: isPrivate, autoInit });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_list_repos': {
        const { visibility, sort, per_page } = args as {
          visibility?: 'all' | 'public' | 'private';
          sort?: 'created' | 'updated' | 'pushed' | 'full_name';
          per_page?: number;
        };
        console.error('Listing GitHub repositories');
        const result = await GitHub.listRepos({ visibility, sort, per_page });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_get_repo': {
        const { owner, repo } = args as { owner: string; repo: string };
        console.error(`Getting GitHub repository: ${owner}/${repo}`);
        const result = await GitHub.getRepo(owner, repo);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_create_issue': {
        const { owner, repo, title, body, labels } = args as {
          owner: string;
          repo: string;
          title: string;
          body?: string;
          labels?: string[];
        };
        console.error(`Creating issue in ${owner}/${repo}: ${title}`);
        const result = await GitHub.createIssue(owner, repo, title, body, labels);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_list_issues': {
        const { owner, repo, state, labels, per_page } = args as {
          owner: string;
          repo: string;
          state?: 'open' | 'closed' | 'all';
          labels?: string;
          per_page?: number;
        };
        console.error(`Listing issues in ${owner}/${repo}`);
        const result = await GitHub.listIssues(owner, repo, { state, labels, per_page });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_create_pr': {
        const { owner, repo, title, head, base, body } = args as {
          owner: string;
          repo: string;
          title: string;
          head: string;
          base: string;
          body?: string;
        };
        console.error(`Creating pull request in ${owner}/${repo}: ${title}`);
        const result = await GitHub.createPR(owner, repo, title, head, base, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_list_prs': {
        const { owner, repo, state, per_page } = args as {
          owner: string;
          repo: string;
          state?: 'open' | 'closed' | 'all';
          per_page?: number;
        };
        console.error(`Listing pull requests in ${owner}/${repo}`);
        const result = await GitHub.listPRs(owner, repo, { state, per_page });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_get_file': {
        const { owner, repo, path, ref } = args as {
          owner: string;
          repo: string;
          path: string;
          ref?: string;
        };
        console.error(`Getting file from ${owner}/${repo}: ${path}`);
        const result = await GitHub.getFile(owner, repo, path, ref);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_create_file': {
        const { owner, repo, path, message, content, sha, branch } = args as {
          owner: string;
          repo: string;
          path: string;
          message: string;
          content: string;
          sha?: string;
          branch?: string;
        };
        console.error(`Creating/updating file in ${owner}/${repo}: ${path}`);
        const result = await GitHub.createOrUpdateFile(owner, repo, path, message, content, sha, branch);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'github_search_code': {
        const { query, per_page } = args as { query: string; per_page?: number };
        console.error(`Searching GitHub code: ${query}`);
        const result = await GitHub.searchCode(query, { per_page });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Command tools
      case 'run_command': {
        const { command, workdir, stdin } = args as {
          command: string;
          workdir?: string;
          stdin?: string;
        };
        console.error(`Running command: ${command}`);
        const result = await Commands.runCommand(command, workdir, stdin);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // SQL tools
      case 'sql_execute_query':
        return await SqlHandlers.handleSqlExecuteQuery(args, sqlConfig);

      case 'sql_list_tables':
        return await SqlHandlers.handleSqlListTables(sqlConfig);

      case 'sql_table_exists':
        return await SqlHandlers.handleSqlTableExists(args, sqlConfig);

      case 'sql_get_table_schema':
        return await SqlHandlers.handleSqlGetTableSchema(args, sqlConfig);

      case 'sql_drop_table':
        return await SqlHandlers.handleSqlDropTable(args, sqlConfig);

      case 'sql_apply_schema_file':
        return await SqlHandlers.handleSqlApplySchemaFile(args, sqlConfig);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing tool ${name}:`, errorMessage);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TaskMaster MCP Server running on stdio');
  console.error(`Tools available: ${tools.length}`);
  console.error('  - Conversation: 3');
  console.error('  - Filesystem: 7');
  console.error('  - GitHub: 10');
  console.error('  - Command: 1');
  console.error('  - SQL: 6');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
