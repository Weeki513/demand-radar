import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const querySchema = z.object({ runId: z.string().uuid() })

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid scan id" }, { status: 422 })

  const { data: run, error } = await supabase
    .from("scan_runs")
    .select("id,status,updated_at,completed_at,error_summary,sources_attempted,sources_succeeded,raw_signals_discovered,clusters_produced")
    .eq("id", parsed.data.runId)
    .maybeSingle()
  if (error || !run) return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  return NextResponse.json({ run })
}
