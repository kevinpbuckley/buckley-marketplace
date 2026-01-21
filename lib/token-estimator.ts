/**
 * Simple client-side token estimation
 * Approximates GPT tokenization (not exact, but good enough for UI display)
 */

export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Rough estimation: ~4 characters per token on average for English text
  // This is a simplification but works reasonably well for display purposes
  const charCount = text.length;
  const estimate = Math.ceil(charCount / 4);
  
  return estimate;
}

export function estimateMessagesTokens(messages: any[]): number {
  let total = 0;
  
  for (const message of messages) {
    // Count role tokens (typically 1-2 tokens per role)
    total += 2;
    
    // Count content tokens
    if (typeof message.content === 'string') {
      total += estimateTokens(message.content);
    } else if (Array.isArray(message.parts)) {
      // Handle AI SDK message format with parts
      for (const part of message.parts) {
        if (part.type === 'text' && part.text) {
          total += estimateTokens(part.text);
        }
        // Count tool invocations (tool calls and results)
        if (part.type.startsWith('tool-')) {
          // Tool name overhead
          total += 10;
          // Tool input (args)
          if (part.input) {
            total += estimateTokens(JSON.stringify(part.input));
          }
          // Tool output (result sent back to LLM)
          if (part.output) {
            total += estimateTokens(JSON.stringify(part.output));
          }
        }
      }
    }
    
    // Add overhead for message formatting (typically 3-4 tokens per message)
    total += 4;
  }
  
  return total;
}

/**
 * Count only tool RESULTS (outputs) which are sent as input to the LLM
 */
export function estimateToolResultTokens(messages: any[]): number {
  let total = 0;
  
  for (const message of messages) {
    if (Array.isArray(message.parts)) {
      for (const part of message.parts) {
        if (part.type.startsWith('tool-') && part.output) {
          // Tool name overhead
          total += 10;
          // Tool output sent to LLM as context
          total += estimateTokens(JSON.stringify(part.output));
        }
      }
    }
  }
  
  return total;
}
