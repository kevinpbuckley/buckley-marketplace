# Buckley

A Sitecore Marketplace app that puts the full power of the Marketplace SDK behind a conversational agent for SitecoreAI, built with Next.js and the Vercel AI SDK.

## Overview

Buckley is a reference implementation showing how to build an AI agent on the Sitecore Marketplace SDK. Instead of one tool per API call, it searches a catalog of every SDK operation (191 as of SDK 0.5), describes the one it needs, and invokes it, with Azure OpenAI running the conversation and the SDK reaching SitecoreAI content.

## Features

- 🤖 **AI Integration**: Demonstrates Azure OpenAI (GPT-4) integration with Vercel AI SDK
- 🔍 **Full Marketplace SDK**: Every SDK operation, from the Agent API to Sites, Pages, Authoring and Content Transfer, through one catalog
- 🛠️ **Marketplace SDK**: Sample integration with Sitecore Marketplace SDK tools
- 💬 **Interactive Chat**: Conversational interface for natural language interactions
- 🔐 **Client-Side Tool Calling**: Tool calling is performed client-side, eliminating the need for authentication tokens in environment variables
- 🔒 **Secure Authentication**: OAuth 2.0 authentication with Sitecore Cloud

## Prerequisites

- Node.js 18+ 
- Azure OpenAI account with API access
- Access to the Sitecore Marketplace and a SitecoreAI environment

## Getting Started

### 1. Clone and Install

```bash
cd buckley-marketplace
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_RESOURCE_NAME=your-azure-resource-name
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-5.6-luna
AZURE_OPENAI_API_VERSION=2024-10-21
```

### 3. Development

Run the development server with HTTPS:

```bash
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
buckley-marketplace/
├── app/              # Next.js app router pages and API routes
├── components/       # React UI components (shadcn/ui)
├── docs/            # Documentation and design documents
├── lib/             # Utility functions and configurations
├── certificates/    # SSL certificates for local HTTPS
└── package.json     # Project dependencies
```

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with Turbopack
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/)
- **AI Provider**: [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
- **Sitecore**: [@sitecore-marketplace-sdk](https://www.npmjs.com/org/sitecore-marketplace-sdk) (client, xmc, ai)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript

## Available Scripts

- `npm run dev` - Start development server with HTTPS
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Documentation

See the [docs](./docs) folder for additional documentation:

- [Tool Design Document](./docs/TOOL_DESIGN_DOCUMENT.md) - Architecture and SDK integration details

## Sample Application

This is a sample implementation for educational and reference purposes. It demonstrates patterns and practices for building AI-powered applications with the Sitecore Marketplace SDK and Vercel AI SDK for SitecoreAI.

## Security Notes

- Uses HTTPS in development for secure local testing
- Tool calling is performed client-side, so authentication tokens are not required in environment variables
- OAuth 2.0 client credentials flow for Sitecore authentication happens in the browser
- Environment variables only needed for Azure OpenAI configuration
- Never commit `.env.local` to version control

## License

Pr
## Support

For questions or issues, please contact the development team.
