import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("envision_token")?.value

  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/login", "/profile", "/change-password"],
}
