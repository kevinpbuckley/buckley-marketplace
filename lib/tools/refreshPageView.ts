import { z } from "zod";
import { tool } from "ai";
import type { ToolDefinition, ToolExecutor } from "./types";

export const definition: ToolDefinition = {
  name: "refreshPageView",
  description:
    "Refresh the visual display of the current page in the Pages editor without doing a full browser refresh. Use this after making changes to content items to see the updates reflected in the page preview. This reloads the canvas/iframe showing the page content.",
  category: "Pages Context",
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        success: true,
        message: "Page view refreshed successfully",
      },
      description: "Refreshes the page canvas after content updates",
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
        "Page context is not available. This tool only works when the app is running inside the Pages editor.",
    };
  }

  try {
    await context.client.mutate("pages.reloadCanvas");

    return {
      success: true,
      output: {
        message: "Page view refreshed successfully",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to refresh page view",
    };
  }
};
