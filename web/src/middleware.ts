import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Disable forced redirects to avoid unexpected navigation.
  // Pages can handle auth state in-place with user messaging.
  void req;
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/order/:path*"],
};

