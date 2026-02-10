import { NextRequest, NextResponse } from 'next/server';

/**
 * Get all versions of a page
 * Proxies to Pages API: GET /api/v1/pages/{pageId}/versions
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

    const authToken = request.headers.get('Authorization');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const url = new URL(`https://xmapps-api.sitecorecloud.io/api/v1/pages/${pageId}/versions`);
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
    console.error('[API/Pages/Versions] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a new version of a page
 * Proxies to Pages API: POST /api/v1/pages/{pageId}/versions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const body = await request.json();
    const { versionName, sitecoreContextId, language } = body;

    if (!sitecoreContextId) {
      return NextResponse.json(
        { error: 'sitecoreContextId is required' },
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

    const url = `https://xmapps-api.sitecorecloud.io/api/v1/pages/${pageId}/versions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sitecoreContextId,
        language: language || 'en',
        versionName: versionName || '',
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
    console.error('[API/Pages/Versions] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
