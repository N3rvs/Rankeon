import { type NextRequest, NextResponse } from 'next/server';

// This middleware does nothing and is a placeholder to prevent errors.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
