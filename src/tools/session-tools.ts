import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const sessionTools: Tool[] = [
  {
    name: 'session_start',
    description: 'Get complete session startup context in one optimized call. Returns handoff document, active work (RoadmapItems and WorkItems with Priority 8+), blocked items, Claude Code execution status, recent learnings from AIMistakesLog, and system health metrics. Replaces 20+ individual queries with a single database call.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];
