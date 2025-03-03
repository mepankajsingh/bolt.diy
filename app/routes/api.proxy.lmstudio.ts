import { json } from '@remix-run/cloudflare';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';

// Handle all HTTP methods
export async function action({ request }: ActionFunctionArgs) {
  return handleProxyRequest(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleProxyRequest(request);
}

async function handleProxyRequest(request: Request) {
  try {
    const url = new URL(request.url);

    // Get the path from query parameters or use empty string
    const path = url.searchParams.get('path') || '';
    url.searchParams.delete('path'); // Remove path from forwarded query

    // Get the base URL from the query parameters or use default
    const baseUrl = url.searchParams.get('baseUrl') || 'http://127.0.0.1:1234';
    url.searchParams.delete('baseUrl'); // Remove baseUrl from forwarded query

    // Reconstruct the target URL
    const targetURL = `${baseUrl}${path}${url.search}`;
    console.log(`Proxying request to: ${targetURL}`);

    // Forward the request to the target URL
    const response = await fetch(targetURL, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),

        // Override host header with the target host
        host: new URL(targetURL).host,
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(request.method) ? null : await request.arrayBuffer(),
    });

    // Create response with CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Forward the response with CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    // Return the response with the original body
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('LM Studio proxy error:', error);
    return json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
