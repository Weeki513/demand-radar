import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const form = await request.formData()
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  })
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/login?error=invalid-input", request.url), 303)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid-credentials", request.url), 303)
  }
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle()

  return NextResponse.redirect(
    new URL(product ? `/app/${product.id}/pulse` : "/", request.url),
    303,
  )
}
