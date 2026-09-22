import { convertToModelMessages, stepCountIs, streamText, UIMessage, type LanguageModelUsage } from 'ai';
import { getDefaultAgent, getAgentAiTools } from '@/lib/agents';
import { resolveActiveTools } from '@/lib/agents/tool-tiers';
import { serverAiTools } from '@/lib/tools/server-tools';
import { trackTokenUsage } from '@/lib/token-tracker';
import { chatModel, deploymentName } from '@/lib/azure-openai';
import { getSkillsIndex } from '@/lib/skills';

// Client-executable tools come from the agent config; the catalog/skills tools execute here.
const agent = getDefaultAgent();
const tools = { ...getAgentAiTools(agent), ...serverAiTools };
const allToolNames = Object.keys(tools);

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

/**
 * Client-side tools mean each request is a single server step, so the unlock state has to be
 * recovered from the conversation rather than from `steps`. Tool parts are typed `tool-<name>`.
 */
function toolNamesUsedIn(messages: ChatUIMessage[]): string[] {
  return messages.flatMap((message) =>
    (message.parts ?? []).flatMap((part) =>
      typeof part.type === 'string' && part.type.startsWith('tool-') ? [part.type.slice(5)] : []
    )
  );
}

export async function POST(req: Request) {
  const { messages }: { messages: ChatUIMessage[] } = await req.json();
  const previouslyCalled = toolNamesUsedIn(messages);

  const modelName = deploymentName;
  console.log('[API/Chat] Processing request with', messages.length, 'messages using model:', modelName);

  const result = await streamText({
    model: chatModel,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    // searchOperations -> describeOperation -> answer runs entirely server-side, so let those
    // chain within one request. Client-side tools still end the step, since their results
    // only arrive from the browser.
    stopWhen: stepCountIs(6),
    activeTools: resolveActiveTools(allToolNames, previouslyCalled),
    prepareStep: ({ steps }) => {
      const called = [
        ...previouslyCalled,
        ...steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)),
      ];
      return { activeTools: resolveActiveTools(allToolNames, called) };
    },
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
