import { NextResponse } from 'next/server';
import { getDefaultAgent, getAgentToolDefinitions } from '@/lib/agents';
import { getToolMode, resolveActiveTools } from '@/lib/agents/tool-tiers';
import { serverToolDefinitions } from '@/lib/tools/server-tools';

/**
 * The tools the model can actually call this request.
 *
 * The client registry holds every tool so it can execute whichever one comes back, but
 * `activeTools` decides what the model is offered. Without this the UI would advertise all
 * of them regardless of mode.
 */
export async function GET() {
  const agent = getDefaultAgent();
  const definitions = [...getAgentToolDefinitions(agent), ...serverToolDefinitions];
  const mode = getToolMode();
  const active = new Set(
    resolveActiveTools(
      definitions.map((d) => d.name),
      [],
      mode
    )
  );

  return NextResponse.json({
    mode,
    registered: definitions.length,
    tools: definitions
      .filter((d) => active.has(d.name))
      .map((d) => ({ name: d.name, description: d.description, category: d.category })),
  });
}
