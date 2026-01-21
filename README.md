# AgenticAPI Agent

An AI-powered agent application for Sitecore XM Cloud solution review and analysis, built with Next.js and the Sitecore Marketplace SDK.

## Overview

AgenticAPI Agent is an intelligent assistant that helps developers and architects review Sitecore XM Cloud solutions. It uses Azure OpenAI to provide conversational AI capabilities combined with Sitecore Marketplace SDK tools to analyze content structures, templates, and configurations.

## Features

- 🤖 **AI-Powered Analysis**: Leverages Azure OpenAI (GPT-4) for intelligent conversation and analysis
- 🔍 **Content Inspection**: Query and analyze Sitecore content items, templates, and structures
- 📊 **Solution Review**: Automated tools to assist with XM Cloud solution reviews
- 💬 **Interactive Chat**: Conversational interface for natural language queries
- 🔐 **Secure Integration**: OAuth 2.0 authentication with Sitecore Cloud

## Prerequisites

- Node.js 18+ 
- Azure OpenAI account with API access
- Access to Sitecore Marketplace SDK services

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
- **AI**: [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) via AI SDK
- **Sitecore SDK**: [@sitecore-marketplace-sdk](https://www.npmjs.com/org/sitecore-marketplace-sdk)
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

## Security Notes

- Uses HTTPS in development for secure local testing
- OAuth 2.0 client credentials flow for Sitecore authentication
- Environment variables for sensitive configuration
- Never commit `.env.local` to version control

## License

Pr
## Support

For questions or issues, please contact the development team.
