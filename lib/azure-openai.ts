import { createAzure } from '@ai-sdk/azure';
import { defaultSettingsMiddleware, wrapLanguageModel } from 'ai';

/**
 * Azure OpenAI provider for the chat API route.
 * Points at the same resource/deployment as the article starter's RAG chat
 * (examples/kit-nextjs-article-starter/src/lib/azure-openai.ts) so both apps
 * answer with the same model.
 */
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
  // The dated api-version above only exists on the classic deployment-based
  // routes; the SDK's new default "/openai/v1" routes only accept "preview".
  useDeploymentBasedUrls: true,
});

export const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.6-luna';

/**
 * gpt-5.x deployments default to OpenAI "strict" JSON schemas, which require every
 * tool property to appear in `required` — this repo's tools (see lib/tools/*) rely on
 * `.optional()` params, so strict mode rejects them with a schema validation error.
 * Disable it via provider options rather than per tool.
 */
export const chatModel = wrapLanguageModel({
  // @ai-sdk/azure v4 defaults the bare `azure(id)`/`.languageModel()` factories to
  // the Responses API, which this resource's api-version doesn't support (404).
  // `.chat()` keeps the Chat Completions route the deployment actually serves.
  model: azure.chat(deploymentName),
  middleware: defaultSettingsMiddleware({
    settings: {
      providerOptions: { openai: { structuredOutputs: false } },
    },
  }),
});
