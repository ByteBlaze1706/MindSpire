// src/middleware.ts
// Entry point middleware. Handles path-based tenant resolution, Supabase session refresh, and role authorization checks.
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { Role } from './lib/permissions/roles';

console.log("[MIDDLEWARE.TS LOADED] Module evaluation complete.");

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

  console.log("[MIDDLEWARE ENTRY] request.url:", request.url);
  console.log("[MIDDLEWARE ENTRY] pathname:", pathname, "segments:", segments);

  // 1. Bypass static assets and global index page (Discovery Flow)
  if (segments.length === 0 || STATIC_Bypass_KEYS.has(segments[0])) {
    console.log("[MIDDLEWARE BYPASS] Match found, bypassing. Pathname:", pathname, "Returning NextResponse.next()");
    const nextResponse = NextResponse.next();
    console.log("[MIDDLEWARE RETURN] Returning NextResponse.next() for bypass path.");
    return nextResponse;
  }

  try {
    // The first segment represents the tenant ID/key (e.g., /columbia/login -> tenant = "columbia")
    const tenantKey = segments[0];

    console.log("[MIDDLEWARE UPDATE_SESSION START] tenantKey:", tenantKey);
    let updateSessionResult;
    try {
      updateSessionResult = await updateSession(request);
      console.log("[MIDDLEWARE UPDATE_SESSION SUCCESS] user:", updateSessionResult.user?.id);
    } catch (err: any) {
      console.error("[MIDDLEWARE UPDATE_SESSION ERROR]", err.message, err.stack);
      throw err;
    }

    const { supabaseResponse, user, supabase } = updateSessionResult;

    // 3. Setup Supabase Server client to verify DB details
    // Since middleware can't run complex queries, we execute a direct lookup of user roles
    let userRole: Role = 'student';
    let isOnboarded = false;
    let isApprovedCounselor = false;
    let userTenantId = '';

    if (user) {
      console.log("[MIDDLEWARE CREATE_CLIENT START] user found:", user.id);
      
      console.log("[MIDDLEWARE DB LOOKUP START]");
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('role, institution_id, is_approved, counselor_status')
        .eq('id', user.id)
        .single();

      if (profileErr) {
        console.error("[MIDDLEWARE DB LOOKUP ERROR]", profileErr);
      } else {
        console.log("[MIDDLEWARE DB LOOKUP SUCCESS] profile:", profile);
      }

      if (profile) {
        userRole = profile.role as Role;
        userTenantId = profile.institution_id;
        isApprovedCounselor = profile.role === 'counselor' && profile.counselor_status === 'approved';
        
        // Check if student profile is active
        const { data: anonProfile, error: anonProfileErr } = await supabase
          .from('anonymous_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (anonProfileErr) {
          console.error("[MIDDLEWARE ANON LOOKUP ERROR]", anonProfileErr);
        }

        isOnboarded = !!anonProfile || userRole !== 'student';
        console.log("[MIDDLEWARE PROFILE DETAILS] userRole:", userRole, "isOnboarded:", isOnboarded);
      }
    }

    // 4. Role Guards and Protected Routes
    const isAuthPage = segments[1] === 'login' || segments[1] === 'register';
    const isOnboardingPage = segments[1] === 'onboarding';

    // If page requires login
    if (!user && !isAuthPage) {
      const loginUrl = new URL(`/${tenantKey}/login`, request.url);
      console.log("[MIDDLEWARE REDIRECT] Guest to Login:", loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    if (user) {
      // If logged in user tries to access login/register
      if (isAuthPage) {
        const dashboardUrl = new URL(`/${tenantKey}/dashboard`, request.url);
        console.log("[MIDDLEWARE REDIRECT] Logged in to Dashboard:", dashboardUrl.toString());
        return NextResponse.redirect(dashboardUrl);
      }

      // Force onboarding if user is student and hasn't set up their profile
      if (userRole === 'student' && !isOnboarded && !isOnboardingPage) {
        const onboardingUrl = new URL(`/${tenantKey}/onboarding`, request.url);
        console.log("[MIDDLEWARE REDIRECT] Student to Onboarding:", onboardingUrl.toString());
        return NextResponse.redirect(onboardingUrl);
      }

      // If already onboarded, prevent access to onboarding
      if (isOnboarded && isOnboardingPage) {
        const dashboardUrl = new URL(`/${tenantKey}/dashboard`, request.url);
        console.log("[MIDDLEWARE REDIRECT] Onboarded to Dashboard:", dashboardUrl.toString());
        return NextResponse.redirect(dashboardUrl);
      }

      // Counselor Verification Guard
      if (userRole === 'counselor' && !isApprovedCounselor && segments[1] === 'counselor') {
        const pendingUrl = new URL(`/${tenantKey}/pending-approval`, request.url);
        console.log("[MIDDLEWARE REDIRECT] Counselor to Pending:", pendingUrl.toString());
        return NextResponse.redirect(pendingUrl);
      }

      // Role-specific routing blocks
      if (segments[1] === 'counselor' && userRole !== 'counselor') {
        console.log("[MIDDLEWARE REDIRECT] Non-counselor to Unauthorized");
        const redirectUrl = new URL('/unauthorized', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      if (segments[1] === 'admin' && userRole !== 'inst_admin') {
        console.log("[MIDDLEWARE REDIRECT] Non-admin to Unauthorized");
        const redirectUrl = new URL('/unauthorized', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      if (segments[1] === 'super-admin' && userRole !== 'super_admin') {
        console.log("[MIDDLEWARE REDIRECT] Non-super-admin to Unauthorized");
        const redirectUrl = new URL('/unauthorized', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Propagate the tenant context through response headers
    supabaseResponse.headers.set('x-tenant-key', tenantKey);
    console.log("[MIDDLEWARE SUCCESS] Propagating tenant:", tenantKey, "Returning supabaseResponse.");
    return supabaseResponse;
  } catch (error: any) {
    console.error("[MIDDLEWARE EXCEPTION HANDLED]", error.message, error.stack);
    throw error;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico|sw.js).*)'],
};
