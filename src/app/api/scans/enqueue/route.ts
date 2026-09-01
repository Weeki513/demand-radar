import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { enqueueScan } from "@/scans/enqueue"

const requestSchema = z.object({
  productId: z.string().uuid(),
  trigger: z.enum(["manual", "scheduled"]).default("manual"),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const input = requestSchema.parse(await request.json())
    const run = await enqueueScan(input.productId, input.trigger)
    return NextResponse.json({ run }, { status: 202 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not enqueue scan" },
      { status: 422 },
    )
  }
}
