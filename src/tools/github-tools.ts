import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const githubTools: Tool[] = [
  {
    name: 'github_create_repo',
    description: 'Create a new GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Repository name',
        },
        description: {
          type: 'string',
          description: 'Repository description',
        },
        private: {
          type: 'boolean',
          description: 'Whether the repository should be private',
        },
        autoInit: {
          type: 'boolean',
          description: 'Whether to initialize with a README',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'github_list_repos',
    description: 'List repositories for authenticated user',
    inputSchema: {
      type: 'object',
      properties: {
        visibility: {
          type: 'string',
          enum: ['all', 'public', 'private'],
          description: 'Filter by repository visibility',
        },
        sort: {
          type: 'string',
          enum: ['created', 'updated', 'pushed', 'full_name'],
          description: 'Sort repositories by',
        },
        per_page: {
          type: 'number',
          description: 'Number of results per page',
        },
      },
    },
  },
  {
    name: 'github_get_repo',
    description: 'Get details of a specific repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'github_create_issue',
    description: 'Create a new issue in a repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        title: {
          type: 'string',
          description: 'Issue title',
        },
        body: {
          type: 'string',
          description: 'Issue body',
        },
        labels: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Issue labels',
        },
      },
      required: ['owner', 'repo', 'title'],
    },
  },
  {
    name: 'github_list_issues',
    description: 'List issues in a repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by issue state',
        },
        labels: {
          type: 'string',
          description: 'Comma-separated list of labels',
        },
        per_page: {
          type: 'number',
          description: 'Number of results per page',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'github_create_pr',
    description: 'Create a new pull request',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        title: {
          type: 'string',
          description: 'Pull request title',
        },
        head: {
          type: 'string',
          description: 'The name of the branch where your changes are',
        },
        base: {
          type: 'string',
          description: 'The name of the branch you want to merge into',
        },
        body: {
          type: 'string',
          description: 'Pull request body',
        },
      },
      required: ['owner', 'repo', 'title', 'head', 'base'],
    },
  },
  {
    name: 'github_list_prs',
    description: 'List pull requests in a repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by pull request state',
        },
        per_page: {
          type: 'number',
          description: 'Number of results per page',
        },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'github_get_file',
    description: 'Get contents of a file from a repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path to the file',
        },
        ref: {
          type: 'string',
          description: 'Git reference (branch, tag, or commit SHA)',
        },
      },
      required: ['owner', 'repo', 'path'],
    },
  },
  {
    name: 'github_create_file',
    description: 'Create or update a file in a repository',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path to the file',
        },
        message: {
          type: 'string',
          description: 'Commit message',
        },
        content: {
          type: 'string',
          description: 'File content',
        },
        sha: {
          type: 'string',
          description: 'SHA of the file being replaced (required for updates)',
        },
        branch: {
          type: 'string',
          description: 'Branch to commit to',
        },
      },
      required: ['owner', 'repo', 'path', 'message', 'content'],
    },
  },
  {
    name: 'github_search_code',
    description: 'Search code in repositories',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        per_page: {
          type: 'number',
          description: 'Number of results per page',
        },
      },
      required: ['query'],
    },
  },
];
