/**
 * Auto-import module for TaskMaster MCP Server
 * Automatically imports Claude Desktop conversations to TaskMaster database
 */

import cron from 'node-cron';
import { Database } from './db.js';
import { TYPES } from 'tedious';

export interface AutoImportConfig {
  db: Database;
  userId: string;
  batchSize?: number;
  throttleMs?: number;
}

interface LastImportState {
  lastImportTimestamp: Date | null;
  isImporting: boolean;
  consecutiveFailures: number;
}

const state: LastImportState = {
  lastImportTimestamp: null,
  isImporting: false,
  consecutiveFailures: 0,
};

/**
 * Get the last import timestamp from database
 */
async function getLastImportTimestamp(db: Database, userId: string): Promise<Date | null> {
  try {
    const result = await db.executeQuery<{ LastImportAt: Date }>(
      `SELECT TOP 1 UpdatedAt as LastImportAt 
       FROM Conversations 
       WHERE UserId = @userId AND Source = 'ClaudeDesktop'
       ORDER BY UpdatedAt DESC`,
      [{ name: 'userId', type: TYPES.NVarChar, value: userId }]
    );
    
    return result.length > 0 ? new Date(result[0].LastImportAt) : null;
  } catch (error) {
    console.error('Error getting last import timestamp:', error);
    return null;
  }
}

/**
 * Import a single conversation to the database
 */
async function importConversation(
  db: Database,
  userId: string,
  conversation: {
    title: string;
    messages: Array<{ role: string; content: string; timestamp?: string }>;
    externalId: string;
    updatedAt: Date;
  }
): Promise<number> {
  const messagesJson = JSON.stringify(conversation.messages);
  
  const result = await db.executeProcedure('sp_SaveConversation', [
    { name: 'Source', type: TYPES.NVarChar, value: 'ClaudeDesktop' },
    { name: 'ExternalId', type: TYPES.NVarChar, value: conversation.externalId },
    { name: 'UserId', type: TYPES.NVarChar, value: userId },
    { name: 'Title', type: TYPES.NVarChar, value: conversation.title },
    { name: 'MessagesJson', type: TYPES.NVarChar, value: messagesJson },
  ]);
  
  const conversationId = result.output.ConversationId || result.results[0]?.Id;
  return conversationId;
}

/**
 * Run the auto-import process
 * 
 * NOTE: This function needs access to the MCP recent_chats tool to discover
 * conversations from Claude Desktop. Since we're running inside the MCP server,
 * we cannot directly call MCP tools from here.
 * 
 * TODO: This needs to be refactored to either:
 * 1. Accept conversations as a parameter (caller uses recent_chats)
 * 2. Use a different mechanism to discover conversations
 * 3. Call TaskMaster API once WorkItem #27 is complete
 */
export async function runAutoImport(config: AutoImportConfig): Promise<void> {
  const { db, userId, batchSize = 10, throttleMs = 1000 } = config;
  
  // Prevent concurrent imports
  if (state.isImporting) {
    console.log('Auto-import already in progress, skipping...');
    return;
  }
  
  try {
    state.isImporting = true;
    console.log('Starting auto-import...');
    
    // Get last import timestamp
    const lastImportTimestamp = await getLastImportTimestamp(db, userId);
    state.lastImportTimestamp = lastImportTimestamp;
    
    console.log(`Last import: ${lastImportTimestamp?.toISOString() || 'never'}`);
    
    // TODO: Need to implement conversation discovery
    // This requires either:
    // - Calling recent_chats tool (but we're inside MCP, can't call ourselves)
    // - Using TaskMaster API (WorkItem #27 - not built yet)
    // - Accepting conversations as parameter
    
    console.log('Auto-import: Conversation discovery not yet implemented');
    console.log('See WorkItem #21 for completion status');
    
    state.consecutiveFailures = 0;
    
  } catch (error) {
    console.error('Auto-import failed:', error);
    state.consecutiveFailures++;
    
    // If we've failed 3 times in a row, log a warning
    if (state.consecutiveFailures >= 3) {
      console.error(`AUTO-IMPORT: ${state.consecutiveFailures} consecutive failures! This may need attention.`);
      // TODO: Create WorkItem for persistent failures (requires WorkItem #24)
    }
  } finally {
    state.isImporting = false;
  }
}

/**
 * Start the auto-import scheduler
 */
export function startAutoImportScheduler(config: AutoImportConfig): void {
  console.log('Auto-import scheduler: Foundation installed');
  console.log('Auto-import scheduler: Awaiting implementation of conversation discovery');
  console.log('See WorkItems #21, #27, #32 for completion');
  
  // Don't actually schedule until implementation is complete
  // The infrastructure is here, just needs the API integration
  
  /*
  // This will be enabled once WorkItem #32 is complete
  // Run on startup
  console.log('Running initial auto-import on startup...');
  runAutoImport(config).catch(error => {
    console.error('Startup auto-import failed:', error);
  });
  
  // Schedule for 8 AM daily
  cron.schedule('0 8 * * *', () => {
    console.log('Running scheduled auto-import (8 AM)...');
    runAutoImport(config).catch(error => {
      console.error('Scheduled auto-import (8 AM) failed:', error);
    });
  });
  
  // Schedule for 8 PM daily
  cron.schedule('0 20 * * *', () => {
    console.log('Running scheduled auto-import (8 PM)...');
    runAutoImport(config).catch(error => {
      console.error('Scheduled auto-import (8 PM) failed:', error);
    });
  });
  
  console.log('Auto-import scheduler started (runs at startup, 8 AM, and 8 PM)');
  */
}

/**
 * Get current auto-import state (for monitoring/debugging)
 */
export function getAutoImportState(): LastImportState {
  return { ...state };
}
