import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function proxyRequest(
  req: NextRequest,
  path: string,
  method: string = 'GET'
) {
  try {
    const url = `${API_BASE_URL}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const body = method !== 'GET' ? await req.json() : undefined;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  return proxyRequest(req, path, 'GET');
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  return proxyRequest(req, path, 'POST');
}

export async function PUT(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  return proxyRequest(req, path, 'PUT');
}

export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  return proxyRequest(req, path, 'DELETE');
}
