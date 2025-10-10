import { Octokit } from '@octokit/rest';

let octokit: Octokit | null = null;

/**
 * Initialize Octokit with GitHub token
 */
export function initializeGitHub(token: string): void {
  octokit = new Octokit({
    auth: token,
  });
}

/**
 * Get initialized Octokit instance
 */
function getOctokit(): Octokit {
  if (!octokit) {
    throw new Error('GitHub not initialized. Provide GITHUB_TOKEN in environment.');
  }
  return octokit;
}

/**
 * Create a new repository
 */
export async function createRepo(
  name: string,
  options?: {
    description?: string;
    private?: boolean;
    autoInit?: boolean;
  }
) {
  const response = await getOctokit().repos.createForAuthenticatedUser({
    name,
    description: options?.description,
    private: options?.private ?? false,
    auto_init: options?.autoInit ?? true,
  });
  
  return response.data;
}

/**
 * List repositories for authenticated user
 */
export async function listRepos(options?: {
  visibility?: 'all' | 'public' | 'private';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  per_page?: number;
}) {
  const response = await getOctokit().repos.listForAuthenticatedUser({
    visibility: options?.visibility ?? 'all',
    sort: options?.sort ?? 'updated',
    per_page: options?.per_page ?? 30,
  });
  
  return response.data;
}

/**
 * Get repository details
 */
export async function getRepo(owner: string, repo: string) {
  const response = await getOctokit().repos.get({
    owner,
    repo,
  });
  
  return response.data;
}

/**
 * Create an issue
 */
export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
) {
  const response = await getOctokit().issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });
  
  return response.data;
}

/**
 * List repository issues
 */
export async function listIssues(
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    per_page?: number;
  }
) {
  const response = await getOctokit().issues.listForRepo({
    owner,
    repo,
    state: options?.state ?? 'open',
    labels: options?.labels,
    per_page: options?.per_page ?? 30,
  });
  
  return response.data;
}

/**
 * Create a pull request
 */
export async function createPR(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
) {
  const response = await getOctokit().pulls.create({
    owner,
    repo,
    title,
    head,
    base,
    body,
  });
  
  return response.data;
}

/**
 * List pull requests
 */
export async function listPRs(
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
  }
) {
  const response = await getOctokit().pulls.list({
    owner,
    repo,
    state: options?.state ?? 'open',
    per_page: options?.per_page ?? 30,
  });
  
  return response.data;
}

/**
 * Get file contents from repository
 */
export async function getFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string
) {
  const response = await getOctokit().repos.getContent({
    owner,
    repo,
    path,
    ref,
  });
  
  if (Array.isArray(response.data) || response.data.type !== 'file') {
    throw new Error('Path is not a file');
  }
  
  // Decode base64 content
  const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
  
  return {
    content,
    sha: response.data.sha,
    size: response.data.size,
  };
}

/**
 * Create or update a file in repository
 */
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  content: string,
  sha?: string,
  branch?: string
) {
  const response = await getOctokit().repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
    branch,
  });
  
  return response.data;
}

/**
 * Search code in repositories
 */
export async function searchCode(
  query: string,
  options?: {
    per_page?: number;
  }
) {
  const response = await getOctokit().search.code({
    q: query,
    per_page: options?.per_page ?? 30,
  });
  
  return response.data.items;
}

/**
 * Get authenticated user info
 */
export async function getAuthenticatedUser() {
  const response = await getOctokit().users.getAuthenticated();
  return response.data;
}
