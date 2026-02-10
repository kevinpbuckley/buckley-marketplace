import { NextRequest, NextResponse } from 'next/server';

/**
 * Get page details including workflow information and commands
 * Proxies to Pages API: GET /api/v1/pages/{pageId}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const sitecoreContextId = searchParams.get('sitecoreContextId');
    const language = searchParams.get('language');

    if (!sitecoreContextId) {
      return NextResponse.json(
        { error: 'sitecoreContextId is required' },
        { status: 400 }
      );
    }

    // TODO: Get auth token from Marketplace SDK context
    // For now, this is a placeholder showing the structure
    // In a real implementation, we'd need to:
    // 1. Get the JWT token from the Marketplace SDK (passed from client)
    // 2. Make authenticated request to Pages API

    const authToken = request.headers.get('Authorization');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const url = new URL(`https://xmapps-api.sitecorecloud.io/api/v1/pages/${pageId}`);
    url.searchParams.set('sitecoreContextId', sitecoreContextId);
    if (language) {
      url.searchParams.set('language', language);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Pages API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API/Pages/Workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Execute a workflow command on a page
 * Proxies to Pages API: POST /api/v1/pages/{pageId}/workflow/command
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const body = await request.json();
    const { commandId, comment, sitecoreContextId } = body;

    if (!sitecoreContextId) {
      return NextResponse.json(
        { error: 'sitecoreContextId is required' },
        { status: 400 }
      );
    }

    if (!commandId) {
      return NextResponse.json(
        { error: 'commandId is required' },
        { status: 400 }
      );
    }

    const authToken = request.headers.get('Authorization');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Attempt to execute workflow command
    // Note: The exact endpoint for executing workflow commands may vary
    // This is based on the Pages API documentation pattern
    const url = `https://xmapps-api.sitecorecloud.io/api/v1/pages/${pageId}/workflow/command`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sitecoreContextId,
        commandId,
        comment: comment || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Pages API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API/Pages/Workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
