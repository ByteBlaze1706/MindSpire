// src/lib/supabase/middleware.ts
// Updates the Supabase auth session in flight. Handles cookie-set redirects cleanly.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '../auth/token';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

  // Use Service Role Key to bypass DB RLS on query updates in middleware
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(
    cleanUrl,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Override getUser to resolve the custom anonymous token session in middleware context
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (jwt?: string) => {
    const customSession = request.cookies.get('mindspire-student-session')?.value;
    if (customSession) {
      const decoded = await verifyToken(customSession);
      if (decoded && decoded.userId) {
        return {
          data: {
            user: {
              id: decoded.userId,
              email: null,
              role: 'student',
              user_metadata: {
                role: 'student',
                institution_id: decoded.institutionId,
              },
            } as any
          },
          error: null
        };
      }
    }
    return originalGetUser(jwt);
  };

  // Refresh token context
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
