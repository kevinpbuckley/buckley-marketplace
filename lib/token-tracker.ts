// Simple in-memory token tracking (resets on server restart)
// For production, consider using Redis or a database

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  lastUpdated: Date;
  modelName?: string;
  lastRequest?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Store usage by session ID
const usageStore = new Map<string, TokenUsage>();

// Default session for simple use cases
const DEFAULT_SESSION = 'default';

// Store the last used model name
let lastModelName: string | undefined;

export function trackTokenUsage(
  sessionId: string = DEFAULT_SESSION,
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number; modelName?: string }
) {
  const existing = usageStore.get(sessionId) || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requestCount: 0,
    lastUpdated: new Date(),
  };

  // Update the last model name if provided
  if (usage.modelName) {
    lastModelName = usage.modelName;
  }

  const updated: TokenUsage = {
    promptTokens: existing.promptTokens + (usage.promptTokens || 0),
    completionTokens: existing.completionTokens + (usage.completionTokens || 0),
    totalTokens: existing.totalTokens + (usage.totalTokens || 0),
    requestCount: existing.requestCount + 1,
    lastUpdated: new Date(),
    modelName: usage.modelName || existing.modelName || lastModelName,
    lastRequest: {
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
    },
  };

  usageStore.set(sessionId, updated);
  console.log(`[TokenTracker] Session ${sessionId}:`, updated);
  
  return updated;
}

export function getTokenUsage(sessionId: string = DEFAULT_SESSION): TokenUsage | null {
  return usageStore.get(sessionId) || null;
}

export function resetTokenUsage(sessionId: string = DEFAULT_SESSION) {
  usageStore.delete(sessionId);
}

export function getAllSessions(): string[] {
  return Array.from(usageStore.keys());
}

export function getModelName(): string | undefined {
  return lastModelName;
}
