import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  void request
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: product, error: productError } = await supabase.from("products").select("id").eq("id", productId).maybeSingle()
  if (productError) return NextResponse.json({ error: "Could not verify product" }, { status: 500 })
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const checkedAt = new Date().toISOString()
  const { error } = await supabase.from("product_user_state").upsert({
    product_id: productId,
    user_id: user.id,
    last_pulse_checked_at: checkedAt,
  }, { onConflict: "product_id,user_id" })
  if (error) return NextResponse.json({ error: "Could not save checkpoint" }, { status: 500 })

  revalidatePath(`/app/${productId}/pulse`)
  return NextResponse.json({ lastPulseCheckedAt: checkedAt })
}
