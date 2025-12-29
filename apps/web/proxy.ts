import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// MOCK MODE: Allow ALL routes without authentication
export function proxy(request: NextRequest) {
  console.log('🔓 PROXY: Allowing request to', request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
