# TaskMaster MCP Server

A Model Context Protocol (MCP) server for managing TaskMaster conversations and integrating with Azure SQL Server.

## Features

This MCP server provides three tools for conversation management:

1. **save_conversation** - Save a new conversation to the TaskMaster database
2. **search_conversations** - Search for conversations by title or message content
3. **get_conversation** - Retrieve a specific conversation with all its messages

## Prerequisites

- Node.js 18 or higher
- Azure SQL Server database with TaskMaster schema
- Required database tables: `Conversations`, `Messages`
- Stored procedure: `sp_SaveConversation`

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your Azure SQL Server credentials:

```env
DB_SERVER=your-server.database.windows.net
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
USER_ID=1
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

Add this server to your Claude Desktop configuration file:

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
        "USER_ID": "1"
      }
    }
  }
}
```

## Tools

### save_conversation

Saves a conversation to the database.

**Parameters:**
- `title` (string, required) - The conversation title
- `messages` (array, required) - Array of message objects with:
  - `role` (string) - Message role (e.g., "user", "assistant")
  - `content` (string) - Message content
  - `timestamp` (string, optional) - Message timestamp

**Returns:** Success message with conversation ID

### search_conversations

Searches for conversations by title or content.

**Parameters:**
- `query` (string, required) - Search query
- `limit` (number, optional, default: 10) - Maximum number of results

**Returns:** Array of matching conversations with metadata

### get_conversation

Retrieves a specific conversation with all messages.

**Parameters:**
- `conversationId` (number, required) - The conversation ID

**Returns:** Full conversation object with all messages

## Database Schema

The server expects the following database structure:

### Conversations Table
- `Id` (int, primary key)
- `Source` (nvarchar)
- `ExternalId` (nvarchar)
- `UserId` (int)
- `Title` (nvarchar)
- `IsActive` (bit)
- `CreatedAt` (datetime)
- `UpdatedAt` (datetime)

### Messages Table
- `Id` (int, primary key)
- `ConversationId` (int, foreign key)
- `Role` (nvarchar)
- `Content` (nvarchar/text)
- `CreatedAt` (datetime)

### Stored Procedure
- `sp_SaveConversation` - Accepts Source, ExternalId, UserId, Title, MessagesJson

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## Security

- All database queries use parameterized statements to prevent SQL injection
- Connection strings should be stored securely using environment variables
- The `.env` file is excluded from version control via `.gitignore`

## License

MIT
