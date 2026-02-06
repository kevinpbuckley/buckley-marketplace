# Sitecore 360 Agent - AI Coding Assistant Guide

## Architecture Overview

This is a **Next.js + Vercel AI SDK** application that provides an AI agent interface for Sitecore XM Cloud using the **Marketplace SDK Agent API**. The unique architecture uses **client-side tool execution** while the LLM runs server-side, eliminating the need for storing Sitecore credentials server-side.

### Key Components
- **`/app/api/chat/route.ts`**: Server-side streaming endpoint (Azure OpenAI via Vercel AI SDK)
- **`/components/chat/ChatWindow.tsx`**: Main client component with tool execution via `onToolCall`
- **`/lib/tools/`**: Modular tool registry system - each tool is a self-contained module
- **`/lib/agents/`**: Agent configurations (JSON + markdown system prompts)
- **`/components/providers/marketplace.tsx`**: Sitecore Marketplace SDK initialization & context

## Tool System Architecture

**Critical Pattern**: Tools are defined in individual files under `lib/tools/` and registered in `lib/tools/index.ts`.

### Adding a New Tool (4 steps):
1. **Create** `lib/tools/myTool.ts` exporting: `definition`, `aiTool`, `execute`
2. **Import** at top of `lib/tools/index.ts`
3. **Register** in `toolRegistry` Map
4. **Enable** in `lib/agents/agent.json` tools array

Example tool structure:
```typescript
// lib/tools/example.ts
export const definition: ToolDefinition = {
  name: "toolName",
  description: "What it does - this guides the AI",
  category: "XMC SDK",
  inputSchema: z.object({ itemId: z.string() }),
  clientSide: true,
};

export const aiTool = tool({ description: definition.description, inputSchema: definition.inputSchema });

export const execute: ToolExecutor = async (input, context) => {
  const { itemId } = input as { itemId: string };
  const response = await context.client.query("xmc.agent.someApi", {
    params: { path: { itemId }, query: { sitecoreContextId: context.contextId } }
  });
  return { success: true, output: response.data };
};
```

### Tool Execution Context
Tools receive `ToolExecutorContext`:
- `client`: Sitecore Marketplace SDK client
- `contextId`: Sitecore API context ID from `appContext.resourceAccess[0].context.preview`
- `pagesContext`: When running in Pages editor, contains `pageInfo` and `siteInfo`

## Sitecore Marketplace SDK Integration

### SDK Modules
- **`@sitecore-marketplace-sdk/client`**: Core SDK with authentication & messaging
- **`@sitecore-marketplace-sdk/xmc`**: XM Cloud module with Agent API (`xmc.agent.*`)

### Agent API Naming Pattern
All Agent API tools use `xmc.agent.<namespace>.<operation>`:
```typescript
client.query("xmc.agent.sitesGetSitesList", { params: { query: { sitecoreContextId } }})
client.mutate("xmc.agent.contentUpdateContent", { params: { path: { itemId }, body: { fields }, query: { sitecoreContextId } }})
```

**Important**: The `sitecoreContextId` is ALWAYS required in the query params for Agent API calls.

### Pages Editor Context
When running inside Sitecore Pages editor, `pagesContext` provides:
- `pageInfo.id` - Current page item ID
- `siteInfo.id` - Current site root ID
- Use `getCurrentPageContext` tool to access this in conversations
- Use `refreshPageView` (mutation: `pages.reloadCanvas`) after content updates

## Development Workflow

### Local Development
```bash
npm run dev  # Starts on https://localhost:3000 with self-signed cert
```
**Why HTTPS?** Sitecore Marketplace requires secure context for SDK initialization.

### Key Files to Update Together
1. **New tool**: `lib/tools/myTool.ts` → `lib/tools/index.ts` → `lib/agents/agent.json`
2. **Agent behavior**: `lib/agents/system-prompt.md` (markdown instructions for LLM)
3. **UI components**: Use shadcn/ui components from `components/ui/`

### Environment Variables
```env
AZURE_API_KEY=<your-key>           # Azure OpenAI API key
AZURE_OPENAI_MODEL=gpt-4o-mini     # Model deployment name
AZURE_API_VERSION=2024-12-01-preview
```

## Common Patterns

### Rich Text Fields
**Always use HTML, never `\n`**:
```typescript
// ❌ Wrong
fields: { Body: "Line 1\nLine 2" }

// ✅ Correct  
fields: { Body: "<p>Line 1</p><p>Line 2</p>" }
```

### Field Name Discovery
Before updating content, ALWAYS:
1. Get item → extract `templateId`
2. Get template → see exact field names (case-sensitive!)
3. Update with correct field names

### Error Handling in Tools
```typescript
try {
  const response = await context.client.query(...);
  return { success: true, output: response.data };
} catch (err) {
  return { success: false, error: err instanceof Error ? err.message : 'Failed' };
}
```

## Testing & Debugging

- **Tool execution logs**: Check browser console for `[ChatWindow]` and tool-specific logs
- **Token tracking**: Built-in UI shows token usage (toggle in chat interface)
- **Marketplace SDK logs**: Look for `[MarketplaceProvider]` in console
- **Agent API errors**: Usually 400 = wrong field names, 401 = auth issue, 404 = item not found

## Architecture Decisions (The "Why")

**Why client-side tool execution?**
- Sitecore SDK requires browser context for OAuth
- No server-side credential storage needed
- Direct access to Pages editor context when embedded

**Why modular tool registry?**
- Each tool is independently testable
- Easy to enable/disable tools per agent
- Clear separation: definition (AI guidance) + execution (business logic)

**Why separate agent.json + system-prompt.md?**
- JSON: structural config (tools, metadata)
- Markdown: behavioral instructions for LLM
- Allows non-developers to tune agent behavior

## Related Documentation
- [`/docs/TOOL_DESIGN_DOCUMENT.md`](../docs/TOOL_DESIGN_DOCUMENT.md) - Detailed SDK API mapping
- [`/lib/agents/system-prompt.md`](../lib/agents/system-prompt.md) - Agent behavioral instructions
- [Marketplace SDK docs](https://doc.sitecore.com/mp/en/developers/sdk/0/sitecore-marketplace-sdk/developer-guides.html)
