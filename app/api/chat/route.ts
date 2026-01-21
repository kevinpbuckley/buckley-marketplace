import { createAzure } from '@ai-sdk/azure';
import { convertToModelMessages, streamText, UIMessage, type LanguageModelUsage } from 'ai';
import { getDefaultAgent, getAgentAiTools } from '@/lib/agents';
import { trackTokenUsage } from '@/lib/token-tracker';

// Create Azure OpenAI client
// Uses AZURE_API_KEY and AZURE_RESOURCE_NAME env vars automatically
const azure = createAzure({
  useDeploymentBasedUrls: true,
  apiVersion: '2024-08-01-preview',
});

// Load the default agent and its tools
const agent = getDefaultAgent();
const tools = getAgentAiTools(agent);

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Define metadata type for usage tracking
export type ChatMessageMetadata = {
  totalUsage?: LanguageModelUsage;
  modelName?: string;
};

// Export the custom UIMessage type for client use
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

export async function POST(req: Request) {
  const { messages }: { messages: ChatUIMessage[] } = await req.json();

  const modelName = process.env.AZURE_OPENAI_MODEL || 'gpt-4o-mini';
  console.log('[API/Chat] Processing request with', messages.length, 'messages using model:', modelName);

  const result = await streamText({
    model: azure(modelName),
    system: agent.config.systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    onFinish: async ({ usage, finishReason }) => {
      console.log('[API/Chat] onFinish callback triggered');
      console.log('[API/Chat] Finish reason:', finishReason);
      console.log('[API/Chat] Usage:', usage);
      
      if (usage) {
        const usageData = {
          promptTokens: (usage as any).promptTokens || (usage as any).inputTokens || 0,
          completionTokens: (usage as any).completionTokens || (usage as any).outputTokens || 0,
          totalTokens: usage.totalTokens || 0,
        };
        console.log('[API/Chat] Usage data:', usageData);
        
        // Track in-memory for localhost debugging
        trackTokenUsage('default', {
          ...usageData,
          modelName: modelName,
        });
      } else {
        console.warn('[API/Chat] No usage data available in onFinish');
      }
    },
  });

  // Return the streaming response with messageMetadata for real token usage
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      // Send total usage when generation is finished
      if (part.type === 'finish') {
        return { 
          totalUsage: part.totalUsage,
          modelName: modelName,
        };
      }
      return undefined;
    },
    headers: {
      'X-Model-Name': modelName,
    },
  });
}
