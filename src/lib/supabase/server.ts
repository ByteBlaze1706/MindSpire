// src/lib/supabase/server.ts
// Supabase SSR server client initializer using dynamic cookies and service role.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/token';

export async function createClient() {
  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

  // Use Service Role Key on the server side to bypass database level RLS blocks cleanly
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createServerClient(
    cleanUrl,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore if called from a React Server Component (RSC)
            // since middleware handles token refreshing.
          }
        },
      },
    }
  );

  // Override getUser to resolve the custom anonymous token session
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    const customSession = cookieStore.get('mindspire-student-session')?.value;
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

  return client;
}
