import { convertToModelMessages, stepCountIs, streamText, UIMessage, type LanguageModelUsage } from 'ai';
import { getDefaultAgent, getAgentAiTools } from '@/lib/agents';
import { serverAiTools } from '@/lib/tools/server-tools';
import { trackTokenUsage } from '@/lib/token-tracker';
import { chatModel, deploymentName } from '@/lib/azure-openai';
import { getSkillsIndex } from '@/lib/skills';
import { compactHistory } from '@/lib/compact-history';

// Client-executable tools come from the agent config; the catalog/skills tools execute here.
const agent = getDefaultAgent();
const tools = { ...getAgentAiTools(agent), ...serverAiTools };

// Skill names and descriptions are cheap; bodies load on demand via the loadSkill tool.
const systemPrompt = [agent.config.systemPrompt, getSkillsIndex()].filter(Boolean).join('\n\n');

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

  const modelName = deploymentName;
  console.log('[API/Chat] Processing request with', messages.length, 'messages using model:', modelName);

  const result = await streamText({
    model: chatModel,
    system: systemPrompt,
    // The client keeps the full history; only the model's copy is shortened.
    messages: await convertToModelMessages(compactHistory(messages)),
    tools,
    // searchOperations -> describeOperation -> answer runs entirely server-side, so let those
    // chain within one request. Client-side tools still end the step, since their results
    // only arrive from the browser.
    stopWhen: stepCountIs(6),
    onFinish: async ({ usage, finishReason }) => {
      console.log('[API/Chat] onFinish callback triggered');
      console.log('[API/Chat] Finish reason:', finishReason);
      console.log('[API/Chat] Usage:', usage);
      
      if (usage) {
        const usageData = {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
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
