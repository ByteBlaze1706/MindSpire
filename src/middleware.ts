// src/middleware.ts
// Entry point middleware. Handles session refresh, role authorization checks, and student onboarding checks.
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { Role } from './lib/permissions/roles';

console.log("[MIDDLEWARE.TS LOADED] Module evaluation complete.");

// Set of path prefixes that do NOT require authentication or check constraints
const STATIC_Bypass_KEYS = new Set([
  'api',
  '_next',
  'favicon.ico',
  'static',
  'images',
  'logo.png',
  'callback',
  'unauthorized',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  console.log("[MIDDLEWARE ENTRY] request.url:", request.url);
  console.log("[MIDDLEWARE ENTRY] pathname:", pathname, "segments:", segments);

  // 1. Bypass static assets and global API routes
  if (segments.length > 0 && STATIC_Bypass_KEYS.has(segments[0])) {
    console.log("[MIDDLEWARE BYPASS] Match found, bypassing. Pathname:", pathname);
    return NextResponse.next();
  }

  const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims';

  try {
    console.log("[MIDDLEWARE UPDATE_SESSION START]");
    let updateSessionResult;
    try {
      updateSessionResult = await updateSession(request);
      console.log("[MIDDLEWARE UPDATE_SESSION SUCCESS] user:", updateSessionResult.user?.id);
    } catch (err: any) {
      console.error("[MIDDLEWARE UPDATE_SESSION ERROR]", err.message, err.stack);
      throw err;
    }

    const { supabaseResponse, user, supabase } = updateSessionResult;

    // 2. Setup database verification details
    let userRole: Role = 'student';
    let isOnboarded = false;
    let isApprovedCounselor = false;

    if (user) {
      console.log("[MIDDLEWARE DB LOOKUP START] user id:", user.id);
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('role, is_approved, counselor_status')
        .eq('id', user.id)
        .single();

      if (profileErr) {
        console.error("[MIDDLEWARE DB LOOKUP ERROR]", profileErr);
      } else {
        console.log("[MIDDLEWARE DB LOOKUP SUCCESS] profile:", profile);
      }

      if (profile) {
        userRole = profile.role as Role;
        isApprovedCounselor = profile.role === 'counselor' && profile.counselor_status === 'approved';

        // Check if student profile exists in anonymous_profiles
        const { data: anonProfile, error: anonProfileErr } = await supabase
          .from('anonymous_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (anonProfileErr && anonProfileErr.code !== 'PGRST116') {
          console.error("[MIDDLEWARE ANON LOOKUP ERROR]", anonProfileErr);
        }

        isOnboarded = !!anonProfile || userRole !== 'student';
        console.log("[MIDDLEWARE PROFILE DETAILS] userRole:", userRole, "isOnboarded:", isOnboarded);
      }
    }

    // 3. Guards and Protected Routes
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isOnboardingPage = pathname === '/onboarding';
    const isLandingPage = pathname === '/';

    // If not logged in, only allow landing page and auth pages
    if (!user) {
      if (!isLandingPage && !isAuthPage) {
        const loginUrl = new URL('/login', request.url);
        console.log("[MIDDLEWARE REDIRECT] Guest to Login:", loginUrl.toString());
        return NextResponse.redirect(loginUrl);
      }
      return supabaseResponse;
    }

    // If user is logged in
    if (user) {
      // Prevent access to landing and auth pages, redirect to dashboard
      if (isLandingPage || isAuthPage) {
        const dashboardUrl = new URL('/dashboard', request.url);
        console.log("[MIDDLEWARE REDIRECT] Logged in to Dashboard:", dashboardUrl.toString());
        return NextResponse.redirect(dashboardUrl);
      }

      // Force onboarding if student is not onboarded yet
      if (userRole === 'student' && !isOnboarded && !isOnboardingPage) {
        const onboardingUrl = new URL('/onboarding', request.url);
        console.log("[MIDDLEWARE REDIRECT] Student to Onboarding:", onboardingUrl.toString());
        return NextResponse.redirect(onboardingUrl);
      }

      // If already onboarded, prevent access to onboarding page
      if (isOnboarded && isOnboardingPage) {
        const dashboardUrl = new URL('/dashboard', request.url);
        console.log("[MIDDLEWARE REDIRECT] Onboarded to Dashboard:", dashboardUrl.toString());
        return NextResponse.redirect(dashboardUrl);
      }

      // Counselor Verification Guard
      if (userRole === 'counselor' && !isApprovedCounselor && pathname.startsWith('/counselor')) {
        const pendingUrl = new URL('/pending-approval', request.url);
        console.log("[MIDDLEWARE REDIRECT] Counselor to Pending:", pendingUrl.toString());
        return NextResponse.redirect(pendingUrl);
      }

      // Role-specific routing blocks
      if (pathname.startsWith('/counselor') && userRole !== 'counselor') {
        console.log("[MIDDLEWARE REDIRECT] Non-counselor to Unauthorized");
        const redirectUrl = new URL('/unauthorized', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      if (pathname.startsWith('/admin') && userRole !== 'inst_admin') {
        console.log("[MIDDLEWARE REDIRECT] Non-admin to Unauthorized");
        const redirectUrl = new URL('/unauthorized', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      if (pathname.startsWith('/super-admin') && userRole !== 'super_admin') {
        console.log("[MIDDLEWARE REDIRECT] Non-super-admin to Unauthorized");
        const redirectUrl = new URL('/unauthorized', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Propagate the tenant context through response headers
    supabaseResponse.headers.set('x-tenant-key', tenantKey);
    console.log("[MIDDLEWARE SUCCESS] Propagating tenant:", tenantKey);
    return supabaseResponse;
  } catch (error: any) {
    console.error("[MIDDLEWARE EXCEPTION HANDLED]", error.message, error.stack);
    throw error;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico|sw.js).*)'],
};
