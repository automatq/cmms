import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth0 } from '@/lib/auth0'

const publicPaths = [
  '/sign-in',
  '/sign-up',
  '/signup',
  '/api/webhooks',
]

function isPublicPath(pathname: string): boolean {
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true
  }
  if (pathname.startsWith('/scan/asset')) return true
  if (pathname.startsWith('/request')) return true
  if (pathname.startsWith('/auth')) return true
  return false
}

export async function middleware(request: NextRequest) {
  // Always let the Auth0 SDK process the request first (handles /auth/* routes, session rolling, etc.)
  const authResponse = await auth0.middleware(request)

  const { pathname } = request.nextUrl

  // Auth0's own routes are fully handled by the SDK
  if (pathname.startsWith('/auth/')) {
    return authResponse
  }

  // Redirect authenticated users from home to dashboard
  if (pathname === '/') {
    const session = await auth0.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return authResponse
  }

  if (isPublicPath(pathname)) {
    return authResponse
  }

  // For protected routes, check if user has a session
  const session = await auth0.getSession()
  if (!session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return authResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
