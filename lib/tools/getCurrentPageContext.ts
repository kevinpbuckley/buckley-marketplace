import { z } from "zod";
import { tool } from "ai";
import type { ToolDefinition, ToolExecutor } from "./types";

export const definition: ToolDefinition = {
  name: "getCurrentPageContext",
  description:
    "Get information about the page the user is currently viewing in the Pages editor. Returns details like page ID, name, path, language, template, and site information. Use this tool when the user asks about 'this page', 'current page', 'what am I viewing', or needs context about the page they're working on. This tool returns real-time information that updates as the user navigates between pages.",
  category: "Pages Context",
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        success: true,
        data: {
          page: {
            id: "abc-123",
            name: "Home",
            path: "/sitecore/content/MySite/Home",
            language: "en",
            templateName: "Page",
          },
          site: {
            id: "site-456",
            name: "MySite",
          },
        },
      },
      description: "Returns the current page context when running in Pages editor",
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

  const { pageInfo, siteInfo } = pagesContext;

  return {
    success: true,
    output: {
      page: {
        id: pageInfo?.id,
        name: pageInfo?.name,
        path: pageInfo?.path,
        language: pageInfo?.language,
        templateId: pageInfo?.templateId,
        templateName: pageInfo?.templateName,
        version: pageInfo?.version,
      },
      site: {
        id: siteInfo?.id,
        name: siteInfo?.name,
        language: siteInfo?.language,
        rootItemId: siteInfo?.rootItemId,
      },
    },
  };
};
