import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getPublicEnv } from "@/lib/env"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const env = getPublicEnv()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot mutate cookies. Middleware or a Route
            // Handler will refresh them on the next request.
          }
        },
      },
    },
  )
}
