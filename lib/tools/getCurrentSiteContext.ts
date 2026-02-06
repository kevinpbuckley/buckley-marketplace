import { z } from "zod";
import { tool } from "ai";
import type { ToolDefinition, ToolExecutor } from "./types";

export const definition: ToolDefinition = {
  name: "getCurrentSiteContext",
  description:
    "Get information about the site the user is currently viewing in the Pages editor. Returns details like site ID, name, language, and root item ID. Use this tool when the user asks about 'this site', 'current site', 'what site am I on', or needs context about the site they're working on. This tool returns real-time site information.",
  category: "Pages Context",
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        success: true,
        data: {
          id: "site-456",
          name: "MySite",
          language: "en",
          rootItemId: "{ROOT-ITEM-ID}",
        },
      },
      description: "Returns the current site context when running in Pages editor",
    },
  ],
  clientSide: true,
};

// Create the AI SDK tool (client-side, no execute function)
export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

// Client-side executor
export const execute: ToolExecutor = async (_input, context) => {
  const { pagesContext } = context;

  if (!pagesContext) {
    return {
      success: false,
      error:
        "Site context is not available. This tool only works when the app is running inside the Pages editor.",
    };
  }

  const { siteInfo } = pagesContext;

  if (!siteInfo) {
    return {
      success: false,
      error: "Site information is not available in the current context.",
    };
  }

  return {
    success: true,
    output: {
      id: siteInfo.id,
      name: siteInfo.name,
      language: siteInfo.language,
      rootItemId: siteInfo.rootItemId,
    },
  };
};
