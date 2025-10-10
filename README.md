# TaskMaster MCP Server

A Model Context Protocol (MCP) server for TaskMaster platform with conversation management, filesystem operations, GitHub integration, command execution, and SQL Server management.

## Features

This MCP server provides **27 tools** across 5 categories:

### **Conversation Management (3 tools)**
1. **save_conversation** - Save conversations to TaskMaster database
2. **search_conversations** - Search conversations by title or content
3. **get_conversation** - Retrieve specific conversations with messages

### **Filesystem Operations (7 tools)**
4. **read_file** - Read file contents
5. **write_file** - Write content to files
6. **list_directory** - List directory contents
7. **search_files** - Search for files by pattern
8. **create_directory** - Create new directories
9. **get_file_info** - Get file metadata
10. **delete_file** - Delete files (requires confirmation)

### **GitHub Integration (10 tools)**
11. **github_create_repo** - Create new repositories
12. **github_list_repos** - List user repositories
13. **github_get_repo** - Get repository details
14. **github_create_issue** - Create issues
15. **github_list_issues** - List repository issues
16. **github_create_pr** - Create pull requests
17. **github_list_prs** - List pull requests
18. **github_get_file** - Get file contents from repository
19. **github_create_file** - Create or update files in repository
20. **github_search_code** - Search code across repositories

### **Command Execution (1 tool)**
21. **run_command** - Execute terminal commands

### **SQL Server Management (6 tools)** ⭐ NEW!
22. **sql_execute_query** - Execute SQL queries with optional read-only mode
23. **sql_list_tables** - List all database tables with row counts
24. **sql_table_exists** - Check if a table exists
25. **sql_get_table_schema** - Get detailed table schema information
26. **sql_drop_table** - Drop tables (requires confirmation)
27. **sql_apply_schema_file** - Apply SQL schema files with GO batch support and transaction wrapping

## Prerequisites

- Node.js 18 or higher
- Azure SQL Server database with TaskMaster schema
- GitHub Personal Access Token (optional, for GitHub tools)

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd taskmaster-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
DB_SERVER=your-server.database.windows.net
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
USER_ID=1
GITHUB_TOKEN=your-github-token  # Optional
```

4. Build the project:
```bash
npm run build
```

## Usage

### Running Standalone
```bash
npm start
```

### Integration with Claude Desktop

Add this server to your Claude Desktop configuration:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "taskmaster": {
      "command": "node",
      "args": ["/absolute/path/to/taskmaster-mcp-server/build/index.js"],
      "env": {
        "DB_SERVER": "your-server.database.windows.net",
        "DB_NAME": "your-database-name",
        "DB_USER": "your-username",
        "DB_PASSWORD": "your-password",
        "USER_ID": "1",
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

## Tool Documentation

### Conversation Tools

#### save_conversation
Save a conversation to the database.

**Parameters:**
- `title` (string, required) - Conversation title
- `messages` (array, required) - Array of message objects with:
  - `role` (string) - Message role (e.g., "user", "assistant")
  - `content` (string) - Message content
  - `timestamp` (string, optional) - Message timestamp

**Returns:** Success message with conversation ID

#### search_conversations
Search for conversations by title or content.

**Parameters:**
- `query` (string, required) - Search query
- `limit` (number, optional, default: 10) - Maximum results

**Returns:** Array of matching conversations

#### get_conversation
Retrieve a specific conversation with all messages.

**Parameters:**
- `conversationId` (number, required) - Conversation ID

**Returns:** Full conversation object with messages

### SQL Tools

#### sql_execute_query
Execute SQL queries with optional read-only safety mode.

**Parameters:**
- `query` (string, required) - SQL query to execute
- `readOnly` (boolean, optional, default: false) - If true, only SELECT queries allowed

**Returns:** Query results with columns, rows, and row count

**Safety:** Read-only mode blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE

#### sql_list_tables
List all tables in the database with row counts.

**Returns:** Array of `{ tableName, schema, rowCount }`

#### sql_table_exists
Check if a table exists.

**Parameters:**
- `tableName` (string, required) - Name of the table
- `schema` (string, optional, default: 'dbo') - Schema name

**Returns:** `{ exists: boolean }`

#### sql_get_table_schema
Get detailed schema information for a table.

**Parameters:**
- `tableName` (string, required) - Name of the table
- `schema` (string, optional, default: 'dbo') - Schema name

**Returns:** Array of column info with data types, constraints, and keys

#### sql_drop_table
Drop a table from the database.

**Parameters:**
- `tableName` (string, required) - Name of the table
- `schema` (string, optional, default: 'dbo') - Schema name  
- `confirm` (boolean, required) - Must be true to proceed

**Safety:** Requires explicit confirmation to prevent accidental deletions

#### sql_apply_schema_file
Apply a SQL schema file with GO batch support and transaction wrapping.

**Parameters:**
- `filePath` (string, required) - Absolute path to SQL file
- `useTransaction` (boolean, optional, default: true) - Wrap in transaction

**Returns:** Detailed results with batch-by-batch success/failure

**Features:**
- Automatic GO statement batch parsing
- Transaction support with rollback on error
- Detailed progress logging
- Comprehensive error reporting

### Filesystem Tools

See tool definitions in code for complete documentation.

### GitHub Tools

Requires `GITHUB_TOKEN` environment variable. See tool definitions for complete documentation.

### Command Tool

**run_command** - Execute terminal commands with optional working directory and stdin.

## Architecture

The MCP server uses a modular architecture for easy maintenance and extension:

```
src/
├── index.ts                    # Main server entry point
├── db.ts                       # Database utilities
├── filesystem.ts               # Filesystem utilities  
├── github-module.ts            # GitHub API integration
├── commands-module.ts          # Command execution
├── sql-module.ts              # SQL Server management
└── tools/                      # Tool definitions
    ├── conversation-tools.ts   # Conversation tool schemas
    ├── filesystem-tools.ts     # Filesystem tool schemas
    ├── github-tools.ts         # GitHub tool schemas
    ├── command-tools.ts        # Command tool schema
    ├── sql-tools.ts           # SQL tool schemas
    └── sql-handlers.ts        # SQL tool implementation
```

### Adding New Tools

1. Create a new file in `src/tools/` with tool definitions:
```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const myTools: Tool[] = [
  {
    name: 'my_tool',
    description: 'Does something useful',
    inputSchema: { /* ... */ }
  }
];
```

2. Import in `src/index.ts`:
```typescript
import { myTools } from './tools/my-tools.js';
```

3. Add to tools array:
```typescript
const tools = [
  ...conversationTools,
  ...myTools,  // Add here
];
```

4. Add handler case in switch statement
5. Build and restart: `npm run build`

## Database Schema

### Required Tables

- **Conversations** - Conversation metadata
- **Messages** - Conversation messages
- **TaskExecutions** - Task execution tracking (optional)

### Stored Procedures

- **sp_SaveConversation** - Saves conversation with messages

See database migration scripts for complete schema.

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing

Test SQL module independently:
```bash
node test-sql-tools.cjs
```

## Security

- ✅ All database queries use parameterized statements (SQL injection protection)
- ✅ Filesystem access restricted to allowed directories
- ✅ File blacklist prevents reading sensitive files (.env, secrets, etc.)
- ✅ SQL read-only mode blocks destructive operations
- ✅ Confirmation required for destructive operations (delete, drop)
- ✅ Transaction support for schema changes (automatic rollback on error)
- ✅ Environment variables for credential management
- ✅ Connection timeouts prevent hanging operations

## Troubleshooting

### "Module not found" errors
- Run `npm install` to ensure all dependencies are installed
- Run `npm run build` to compile TypeScript

### Database connection fails
- Verify credentials in `.env`
- Check firewall allows connection to Azure SQL
- Ensure user has required permissions

### Tools not appearing in Claude Desktop
- Restart Claude Desktop completely
- Check MCP server logs in Claude Desktop settings
- Verify `claude_desktop_config.json` path is correct

## License

MIT

## Version

**1.0.0** - Modular architecture with SQL management tools

---

**Last Updated:** October 10, 2025  
**Total Tools:** 27
