import { NextRequest, NextResponse } from 'next/server';

/**
 * Delete a page
 * Proxies to Pages API: DELETE /api/v1/pages/{pageId}
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const sitecoreContextId = searchParams.get('sitecoreContextId');
    const permanently = searchParams.get('permanently') === 'true';

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

    const url = new URL(`https://xmapps-api.sitecorecloud.io/api/v1/pages/${pageId}`);
    url.searchParams.set('sitecoreContextId', sitecoreContextId);
    url.searchParams.set('permanently', permanently.toString());

    const response = await fetch(url.toString(), {
      method: 'DELETE',
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
    console.error('[API/Pages/Delete] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
