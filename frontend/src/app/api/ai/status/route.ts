import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  console.log('[AI Status API] Starting request');
  console.log('[AI Status API] Environment check:', {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    backendUrl
  });
  
  try {
    const session = await getServerSession(authOptions);
    console.log('[AI Status API] Session check:', { 
      hasSession: !!session, 
      hasAccessToken: !!session?.accessToken,
      userId: session?.user?.id 
    });
    
    if (!session?.accessToken) {
      console.log('[AI Status API] No access token, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[AI Status API] Making request to backend:', `${backendUrl}/api/ai/status`);
    
    const response = await fetch(`${backendUrl}/api/ai/status`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[AI Status API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Status API] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json(
        { error: 'Failed to fetch AI status', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[AI Status API] Success:', { dataKeys: Object.keys(data) });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AI Status API] Unexpected error:', {
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