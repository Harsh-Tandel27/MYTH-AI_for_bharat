import { NextRequest, NextResponse } from 'next/server';
import { resolveVariables } from '@/app/agentai/lib/variable-resolver';
import { type ExecutionContext } from '@/app/agentai/lib/node-schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { method, url, headers, body, authType, authValue, context } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    // Resolve variables in URL, headers, and body
    const executionContext: ExecutionContext = context || {};
    const resolvedUrl = resolveVariables(url, executionContext);
    const resolvedBody = body ? resolveVariables(body, executionContext) : null;

    console.log('[HTTP] Method:', method || 'GET');
    console.log('[HTTP] URL:', resolvedUrl);

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Parse user headers (JSON object or key-value pairs)
    if (headers) {
      try {
        const parsedHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
        Object.entries(parsedHeaders).forEach(([key, value]) => {
          if (key && value) {
            requestHeaders[key] = resolveVariables(String(value), executionContext);
          }
        });
      } catch (e) {
        console.log('[HTTP] Could not parse headers:', e);
      }
    }

    // Add authentication
    if (authType && authValue) {
      const resolvedAuthValue = resolveVariables(authValue, executionContext);
      
      switch (authType) {
        case 'bearer':
          requestHeaders['Authorization'] = `Bearer ${resolvedAuthValue}`;
          break;
        case 'apiKey':
          requestHeaders['X-API-Key'] = resolvedAuthValue;
          break;
        case 'basic':
          requestHeaders['Authorization'] = `Basic ${Buffer.from(resolvedAuthValue).toString('base64')}`;
          break;
      }
    }

    console.log('[HTTP] Headers:', Object.keys(requestHeaders).join(', '));

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: requestHeaders,
    };

    // Add body for non-GET requests
    if (resolvedBody && method !== 'GET') {
      try {
        // Try to parse as JSON, otherwise send as string
        fetchOptions.body = JSON.stringify(JSON.parse(resolvedBody));
      } catch {
        fetchOptions.body = resolvedBody;
      }
    }

    // Make the request with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(resolvedUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Get response data
      let responseData: any;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      console.log('[HTTP] Status:', response.status);
      console.log('[HTTP] Response type:', contentType);

      return NextResponse.json({
        success: response.ok,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          url: resolvedUrl,
          method: method || 'GET',
          timestamp: new Date().toISOString(),
        },
      });

    } catch (fetchError) {
      clearTimeout(timeout);
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'HTTP request failed';
      console.error('[HTTP] Fetch error:', errorMessage);
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        output: {
          status: 0,
          error: errorMessage,
          url: resolvedUrl,
          method: method || 'GET',
          timestamp: new Date().toISOString(),
        },
      });
    }

  } catch (error) {
    console.error('[HTTP] Error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'HTTP request failed' },
      { status: 500 }
    );
  }
}
