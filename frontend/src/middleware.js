import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/invite'
])

export default clerkMiddleware((auth, req) => {
  // If it's a public route, allow access
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // For protected routes, check authentication
  const { userId } = auth()
  
  if (!userId) {
    // // Redirect to sign-in if not authenticated
    // const signInUrl = new URL('/sign-in', req.url)
    // signInUrl.searchParams.set('redirect_url', req.url)
    // return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}