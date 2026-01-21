import { NextRequest, NextResponse } from 'next/server';
import { getTokenUsage, resetTokenUsage, getModelName } from '@/lib/token-tracker';

// GET - retrieve current token usage
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'default';
  const usage = getTokenUsage(sessionId);
  const modelName = usage?.modelName || getModelName() || process.env.AZURE_OPENAI_MODEL || 'gpt-4o-mini';
  const contextSize = parseInt(process.env.NEXT_PUBLIC_MAX_CONTEXT_SIZE || '128000', 10);
  
  return NextResponse.json({
    sessionId,
    modelName,
    contextSize,
    usage: usage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      lastUpdated: null,
      modelName,
      lastRequest: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    },
  });
}

// DELETE - reset token usage for a session
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'default';
  resetTokenUsage(sessionId);
  
  return NextResponse.json({
    sessionId,
    message: 'Token usage reset',
  });
}
