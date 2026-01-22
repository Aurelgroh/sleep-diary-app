import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require auth
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/auth/setup',      // Therapist password setup
    '/auth/pending',    // Pending activation page
    '/invite',          // Patient invitation (includes /invite/accept)
    '/api/cron',        // Cron jobs (protected by CRON_SECRET)
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and on auth pages (except pending/setup), redirect to home
  if (user && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Check therapist status for therapist routes
  if (user && pathname.startsWith('/therapist')) {
    const { data: therapist } = await supabase
      .from('therapists')
      .select('status')
      .eq('id', user.id)
      .single()

    if (therapist) {
      if (therapist.status === 'pending') {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/pending'
        return NextResponse.redirect(url)
      }

      if (therapist.status === 'suspended') {
        // Sign out and redirect to login with message
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        url.searchParams.set('error', 'Your account has been suspended')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
