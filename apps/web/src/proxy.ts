import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function configuredAddresses(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
}

function requestAddress(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-vercel-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || undefined;
}

export function proxy(request: NextRequest) {
  const allowedAddresses = configuredAddresses(process.env.ADMIN_ALLOWED_IPS);
  if (allowedAddresses.length > 0) {
    const address = requestAddress(request);
    if (!address || !allowedAddresses.includes(address)) {
      return new NextResponse('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
