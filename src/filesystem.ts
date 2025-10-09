import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, statSync } from 'fs';

// Allowed paths for filesystem access
const ALLOWED_PATHS = [
  '/Users/jasonberkes/Desktop/Claude Data',
  '/Users/jasonberkes/Dropbox/Dev',
  '/Users/jasonberkes/Dropbox/DevTaskMaster',
  '/Users/jasonberkes/Dropbox/AIData',
];

// Blacklisted files that should never be read
const BLACKLISTED_FILES = ['.env', '.env.local', '.env.production', 'secrets.json'];

/**
 * Check if a path is within allowed directories
 */
export function isPathAllowed(filePath: string): boolean {
  const normalizedPath = path.resolve(filePath);
  return ALLOWED_PATHS.some(allowedPath => 
    normalizedPath.startsWith(path.resolve(allowedPath))
  );
}

/**
 * Check if a file is blacklisted
 */
export function isFileBlacklisted(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return BLACKLISTED_FILES.some(blacklisted => 
    fileName.toLowerCase() === blacklisted.toLowerCase()
  );
}

/**
 * Read file contents
 */
export async function readFile(filePath: string): Promise<string> {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  if (isFileBlacklisted(filePath)) {
    throw new Error(`Access denied: Cannot read blacklisted file`);
  }
  
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

/**
 * Write file contents
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  if (isFileBlacklisted(filePath)) {
    throw new Error(`Access denied: Cannot write to blacklisted file`);
  }
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * List directory contents
 */
export async function listDirectory(dirPath: string): Promise<Array<{
  name: string;
  type: 'file' | 'directory';
  size?: number;
}>> {
  if (!isPathAllowed(dirPath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  if (!existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }
  
  const entries = await fs.readdir(dirPath);
  const results = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    try {
      const stats = statSync(fullPath);
      results.push({
        name: entry,
        type: stats.isDirectory() ? 'directory' as const : 'file' as const,
        size: stats.isFile() ? stats.size : undefined,
      });
    } catch (err) {
      // Skip files we can't stat
      console.error(`Error stating ${fullPath}:`, err);
    }
  }
  
  return results;
}

/**
 * Search for files matching a pattern
 */
export async function searchFiles(
  searchPath: string,
  pattern: string
): Promise<string[]> {
  if (!isPathAllowed(searchPath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  if (!existsSync(searchPath)) {
    throw new Error(`Path not found: ${searchPath}`);
  }
  
  const results: string[] = [];
  const lowerPattern = pattern.toLowerCase();
  
  async function search(dir: string) {
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      
      try {
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Recursively search subdirectories
          await search(fullPath);
        } else if (stats.isFile()) {
          // Check if filename matches pattern
          if (entry.toLowerCase().includes(lowerPattern)) {
            results.push(fullPath);
          }
        }
      } catch (err) {
        // Skip files/dirs we can't access
        console.error(`Error accessing ${fullPath}:`, err);
      }
    }
  }
  
  await search(searchPath);
  return results;
}

/**
 * Create directory
 */
export async function createDirectory(dirPath: string): Promise<void> {
  if (!isPathAllowed(dirPath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Delete file (requires confirmation)
 */
export async function deleteFile(filePath: string): Promise<void> {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Note: Confirmation handled by MCP tool call
  await fs.unlink(filePath);
}

/**
 * Get file info
 */
export async function getFileInfo(filePath: string): Promise<{
  name: string;
  size: number;
  isDirectory: boolean;
  created: Date;
  modified: Date;
}> {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  if (!existsSync(filePath)) {
    throw new Error(`Path not found: ${filePath}`);
  }
  
  const stats = statSync(filePath);
  
  return {
    name: path.basename(filePath),
    size: stats.size,
    isDirectory: stats.isDirectory(),
    created: stats.birthtime,
    modified: stats.mtime,
  };
}
