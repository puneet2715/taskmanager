import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  console.log('[AI Health API] Starting request');
  console.log('[AI Health API] Environment check:', {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    backendUrl
  });
  
  try {
    console.log('[AI Health API] Making request to backend:', `${backendUrl}/api/ai/health`);
    
    const response = await fetch(`${backendUrl}/api/ai/health`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[AI Health API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Health API] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json(
        { error: 'Failed to reach backend', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[AI Health API] Success:', { dataKeys: Object.keys(data) });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AI Health API] Unexpected error:', {
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