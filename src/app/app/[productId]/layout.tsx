import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"

import { AppShell } from "@/components/app-shell"
import { productFromRow } from "@/lib/product-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Locale } from "@/lib/i18n"

export default async function ProductLayout({ children, params }: { children: ReactNode; params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const locale = ((await cookies()).get("demand-radar-locale")?.value === "ru" ? "ru" : "en") satisfies Locale
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: rows } = await supabase
    .from("products")
    .select("id,name,public_url,additional_context,product_context_items(kind,text,visibility)")
    .order("created_at")
  const products = (rows ?? []).map(productFromRow)
  const product = products.find((item) => item.id === productId)
  if (!product) notFound()

  return <AppShell product={product} products={products} initialLocale={locale}>{children}</AppShell>
}
