import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ScanTrigger = "manual" | "scheduled"

export async function enqueueScan(productId: string, trigger: ScanTrigger) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("enqueue_scan", {
    p_product_id: productId,
    p_trigger: trigger,
  })

  if (error) throw new Error(error.message)
  return data
}
