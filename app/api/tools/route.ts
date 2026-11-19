import { NextResponse } from 'next/server';
import { getDefaultAgent, getAgentToolDefinitions } from '@/lib/agents';
import { serverToolDefinitions } from '@/lib/tools/server-tools';

/** Every tool the model is offered: the client tools from agent.json plus the server tools. */
export async function GET() {
  const agent = getDefaultAgent();
  const definitions = [...getAgentToolDefinitions(agent), ...serverToolDefinitions];

  return NextResponse.json({
    tools: definitions.map((d) => ({ name: d.name, description: d.description, category: d.category })),
  });
}
