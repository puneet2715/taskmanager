import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[Latest Summary API] Starting request');
  console.log('[Latest Summary API] Environment check:', {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    backendUrl
  });

  try {
    const session = await getServerSession(authOptions);
    console.log('[Latest Summary API] Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      userId: session?.user?.id
    });

    if (!session?.accessToken) {
      console.log('[Latest Summary API] No access token, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log('[Latest Summary API] Project ID:', id);

    const backendEndpoint = `${backendUrl}/api/ai/projects/${id}/summary/latest`;
    console.log('[Latest Summary API] Making request to backend:', backendEndpoint);

    const response = await fetch(backendEndpoint, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Latest Summary API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Latest Summary API] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json(
        { error: 'Failed to fetch latest project summary', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Latest Summary API] Success:', { dataKeys: Object.keys(data) });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Latest Summary API] Unexpected error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}