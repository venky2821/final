import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next(); // Ensure response is correctly passed

  // Add the CSP header
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' data:; style-src 'self' 'unsafe-inline' data:;"
  );

  return res; // Return the response object
}

// Apply middleware only to specific paths (Optional)
export const config = {
  matcher: "/:path*", // Matches all routes
};
