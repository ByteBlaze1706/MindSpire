// src/middleware.ts
// Entry point middleware. Handles path-based tenant resolution, Supabase session refresh, and role authorization checks.
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { createClient } from './lib/supabase/server';
import { Role } from './lib/permissions/roles';

// Set of path prefixes that do NOT represent tenant keys
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

  // 1. Bypass static assets and global index page (Discovery Flow)
  if (segments.length === 0 || STATIC_Bypass_KEYS.has(segments[0])) {
    return NextResponse.next();
  }

  // The first segment represents the tenant ID/key (e.g., /columbia/login -> tenant = "columbia")
  const tenantKey = segments[0];

  // 2. Refresh the Supabase session
  const { supabaseResponse, user } = await updateSession(request);

  // 3. Setup Supabase Server client to verify DB details
  // Since middleware can't run complex queries, we execute a direct lookup of user roles
  let userRole: Role = 'student';
  let isOnboarded = false;
  let isApprovedCounselor = false;
  let userTenantId = '';

  if (user) {
    // Resolve user profile properties from database
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('users')
      .select('role, institution_id, is_approved, counselor_status')
      .eq('id', user.id)
      .single();

    if (profile) {
      userRole = profile.role as Role;
      userTenantId = profile.institution_id;
      isApprovedCounselor = profile.role === 'counselor' && profile.counselor_status === 'approved';
      
      // Check if student profile is active
      const { data: anonProfile } = await supabase
        .from('anonymous_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      isOnboarded = !!anonProfile || userRole !== 'student';
    }
  }

  // 4. Role Guards and Protected Routes
  const isAuthPage = segments[1] === 'login' || segments[1] === 'register';
  const isOnboardingPage = segments[1] === 'onboarding';

  // If page requires login
  if (!user && !isAuthPage) {
    const loginUrl = new URL(`/${tenantKey}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    // If logged in user tries to access login/register
    if (isAuthPage) {
      const dashboardUrl = new URL(`/${tenantKey}/dashboard`, request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Force onboarding if user is student and hasn't set up their profile
    if (userRole === 'student' && !isOnboarded && !isOnboardingPage) {
      const onboardingUrl = new URL(`/${tenantKey}/onboarding`, request.url);
      return NextResponse.redirect(onboardingUrl);
    }

    // If already onboarded, prevent access to onboarding
    if (isOnboarded && isOnboardingPage) {
      const dashboardUrl = new URL(`/${tenantKey}/dashboard`, request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Counselor Verification Guard
    if (userRole === 'counselor' && !isApprovedCounselor && segments[1] === 'counselor') {
      const pendingUrl = new URL(`/${tenantKey}/pending-approval`, request.url);
      return NextResponse.redirect(pendingUrl);
    }

    // Role-specific routing blocks
    if (segments[1] === 'counselor' && userRole !== 'counselor') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (segments[1] === 'admin' && userRole !== 'inst_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (segments[1] === 'super-admin' && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Propagate the tenant context through response headers
  supabaseResponse.headers.set('x-tenant-key', tenantKey);
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico|sw.js).*)'],
};
