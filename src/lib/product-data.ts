import type { DemoProduct } from "@/lib/demo-data"

type ProductRow = {
  id: string
  name: string
  public_url: string
  additional_context: string
  product_context_items?: Array<{ kind: string; text: string; visibility: string }>
}

export function productFromRow(row: ProductRow): DemoProduct {
  const items = row.product_context_items ?? []
  const ofKind = (kind: string) => items.filter((item) => item.kind === kind).map((item) => item.text)
  const nameWords = row.name.split(/\s+/).filter(Boolean)

  return {
    id: row.id,
    name: row.name,
    description: row.additional_context,
    url: row.public_url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    initials: nameWords.slice(0, 2).map((word) => word[0]).join("").toUpperCase(),
    positioning: ofKind("positioning")[0] ?? row.additional_context,
    icp: ofKind("icp")[0] ?? "",
    problems: ofKind("problem"),
    capabilities: [...ofKind("capability"), ...ofKind("feature")],
    roadmap: items.filter((item) => item.visibility === "private" || item.kind === "roadmap").map((item) => item.text),
    keywords: ofKind("keyword"),
  }
}
