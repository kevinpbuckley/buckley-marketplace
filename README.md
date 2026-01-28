# AgenticAPI Agent

A sample application demonstrating how to integrate Sitecore Agentic API with Vercel AI SDK in the Sitecore Marketplace, built with Next.js.

## Overview

AgenticAPI Agent is a reference implementation showcasing how to build AI-powered applications using the Sitecore Agentic API alongside the Vercel AI SDK. This sample demonstrates conversational AI capabilities with Azure OpenAI integrated with Sitecore Marketplace SDK tools for interacting with Sitecore XM Cloud content.

## Features

- 🤖 **AI Integration**: Demonstrates Azure OpenAI (GPT-4) integration with Vercel AI SDK
- 🔍 **Sitecore Agentic API**: Examples of using Agentic API to query content items, templates, and structures
- 🛠️ **Marketplace SDK**: Sample integration with Sitecore Marketplace SDK tools
- 💬 **Interactive Chat**: Conversational interface for natural language interactions
- 🔐 **Client-Side Tool Calling**: Tool calling is performed client-side, eliminating the need for authentication tokens in environment variables
- 🔒 **Secure Authentication**: OAuth 2.0 authentication with Sitecore Cloud

## Prerequisites

- Node.js 18+ 
- Azure OpenAI account with API access
- Access to Sitecore Marketplace and Agentic API services

## Getting Started

### 1. Clone and Install

```bash
cd AgenticAPI_Agent
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
AZURE_FOUNDRY_API_KEY=your-azure-api-key
AZURE_OPENAI_MODEL=gpt-4o-mini
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
AgenticAPI_Agent/
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
- **Sitecore**: [@sitecore-marketplace-sdk](https://www.npmjs.com/org/sitecore-marketplace-sdk) + Agentic API
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

This is a sample implementation for educational and reference purposes. It demonstrates patterns and practices for building AI-powered applications with Sitecore Agentic API and Vercel AI SDK in the Sitecore Marketplace ecosystem.

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
