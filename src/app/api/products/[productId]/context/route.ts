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

const visibilityValues = ["public", "private"] as const
const sourceValues = ["manual", "ai"] as const

const itemSchema = z.object({
  kind: z.enum(contextKinds),
  text: z.string().trim().min(1).max(2_000),
  visibility: z.enum(visibilityValues).default("public"),
  source: z.enum(sourceValues).default("manual"),
  sortOrder: z.number().int().min(-100_000).max(100_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const productSchema = z.object({
  publicUrl: z.string().url().max(2_048).optional(),
  additionalContext: z.string().trim().max(10_000).optional(),
})

const itemSelect = "id,product_id,kind,text,visibility,source,sort_order,metadata,created_at,updated_at"

async function getOwnedProduct(productId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, product: null }

  const { data: product, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle()

  return { supabase, user, product: error ? null : product }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params
  const { supabase, user, product } = await getOwnedProduct(productId)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const parsed = itemSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid context item", details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("product_context_items")
    .insert({
      product_id: productId,
      kind: parsed.data.kind,
      text: parsed.data.text,
      visibility: parsed.data.visibility,
      source: parsed.data.source,
      sort_order: parsed.data.sortOrder ?? 0,
      metadata: parsed.data.metadata ?? {},
    })
    .select(itemSelect)
    .single()

  if (error) return NextResponse.json({ error: "Could not create context item" }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params
  const { supabase, user, product } = await getOwnedProduct(productId)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const parsed = productSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid product context" }, { status: 422 })
  }

  const updates: { public_url?: string; additional_context?: string } = {}
  if (parsed.data.publicUrl !== undefined) updates.public_url = parsed.data.publicUrl
  if (parsed.data.additionalContext !== undefined) updates.additional_context = parsed.data.additionalContext

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select("id,public_url,additional_context,updated_at")
    .single()

  if (error) return NextResponse.json({ error: "Could not save product context" }, { status: 500 })
  return NextResponse.json({ product: data })
}
