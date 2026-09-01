import { NextResponse } from "next/server"

import { getServerEnv } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const env = getServerEnv()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: env.DEMO_EMAIL,
    password: env.DEMO_PASSWORD,
  })

  if (error) {
    return NextResponse.json(
      { error: "The demo workspace is temporarily unavailable." },
      { status: 503 },
    )
  }

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("is_demo", true)
    .limit(1)
    .maybeSingle()
  const destination = new URL(
    product ? `/app/${product.id}/pulse` : "/login?error=demo-unavailable",
    request.url,
  )
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ ok: true, redirectTo: destination.pathname })
  }

  return NextResponse.redirect(destination, 303)
}
