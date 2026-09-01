import { z } from "zod"

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
  SOLARI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  WORKER_SECRET: z.string().min(32),
  DEMO_EMAIL: z.string().email(),
  DEMO_PASSWORD: z.string().min(12),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    ...getPublicEnv(),
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SOLARI_API_KEY: process.env.SOLARI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WORKER_SECRET: process.env.WORKER_SECRET,
    DEMO_EMAIL: process.env.DEMO_EMAIL,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD,
  })
}
