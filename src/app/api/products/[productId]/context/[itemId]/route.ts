import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const contextKinds = [
  "positioning",
  "icp",
  "problem",
  "capability",
  "feature",
  "differentiator",
  "roadmap",
  "keyword",
] as const

const itemPatchSchema = z
  .object({
    kind: z.enum(contextKinds).optional(),
    text: z.string().trim().min(1).max(2_000).optional(),
    visibility: z.enum(["public", "private"]).optional(),
    source: z.enum(["manual", "ai"]).optional(),
    sortOrder: z.number().int().min(-100_000).max(100_000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")

const itemSelect = "id,product_id,kind,text,visibility,source,sort_order,metadata,created_at,updated_at"

async function getOwnedItem(productId: string, itemId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, item: null }

  const { data: item, error } = await supabase
    .from("product_context_items")
    .select(itemSelect)
    .eq("id", itemId)
    .eq("product_id", productId)
    .maybeSingle()

  return { supabase, user, item: error ? null : item }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string; itemId: string }> },
) {
  const { productId, itemId } = await params
  const { supabase, user, item } = await getOwnedItem(productId, itemId)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!item) return NextResponse.json({ error: "Context item not found" }, { status: 404 })

  const parsed = itemPatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid context item", details: parsed.error.flatten() }, { status: 422 })
  }

  const updates: {
    kind?: (typeof contextKinds)[number]
    text?: string
    visibility?: "public" | "private"
    source?: "manual" | "ai"
    sort_order?: number
    metadata?: Record<string, unknown>
  } = {}
  if (parsed.data.kind !== undefined) updates.kind = parsed.data.kind
  if (parsed.data.text !== undefined) updates.text = parsed.data.text
  if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility
  if (parsed.data.source !== undefined) updates.source = parsed.data.source
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder
  if (parsed.data.metadata !== undefined) updates.metadata = parsed.data.metadata

  const { data, error } = await supabase
    .from("product_context_items")
    .update(updates)
    .eq("id", itemId)
    .eq("product_id", productId)
    .select(itemSelect)
    .single()

  if (error) return NextResponse.json({ error: "Could not update context item" }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string; itemId: string }> },
) {
  const { productId, itemId } = await params
  const { supabase, user, item } = await getOwnedItem(productId, itemId)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!item) return NextResponse.json({ error: "Context item not found" }, { status: 404 })

  const { error } = await supabase
    .from("product_context_items")
    .delete()
    .eq("id", itemId)
    .eq("product_id", productId)

  if (error) return NextResponse.json({ error: "Could not delete context item" }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
