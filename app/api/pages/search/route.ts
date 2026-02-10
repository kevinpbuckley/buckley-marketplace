import { NextRequest, NextResponse } from 'next/server';

/**
 * Search pages using the Pages API advanced search
 * Proxies to Pages API: GET /api/v1/pages/search
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sitecoreContextId = searchParams.get('sitecoreContextId');
    const searchTerm = searchParams.get('searchTerm');
    const site = searchParams.get('site');
    const language = searchParams.get('language');
    const templateId = searchParams.get('templateId');
    const pageSize = searchParams.get('pageSize') || '100';
    const pageNumber = searchParams.get('pageNumber') || '1';

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

    const url = new URL('https://xmapps-api.sitecorecloud.io/api/v1/pages/search');
    url.searchParams.set('sitecoreContextId', sitecoreContextId);

    if (searchTerm) url.searchParams.set('searchTerm', searchTerm);
    if (site) url.searchParams.set('site', site);
    if (language) url.searchParams.set('language', language);
    if (templateId) url.searchParams.set('templateId', templateId);
    url.searchParams.set('pageSize', pageSize);
    url.searchParams.set('pageNumber', pageNumber);

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
    console.error('[API/Pages/Search] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
