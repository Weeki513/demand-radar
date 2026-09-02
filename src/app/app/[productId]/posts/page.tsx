import { PageHeader } from "@/components/page-header"
import { PostComposer } from "@/components/post-composer"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { LocalizedText } from "@/lib/i18n"

export default async function PostsPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: post } = await supabase
    .from("posts")
    .select("id,plain_text,platform,demand_clusters(title)")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Draft studio" title="Posts" description="Turn a useful demand signal into a clear public contribution. Edit the draft inline, preview AI rewrites, and keep platform constraints visible." />{post ? <PostComposer postId={post.id} initialContent={post.plain_text} platform={post.platform} clusterTitle={(post.demand_clusters as { title?: string } | null)?.title ?? "Demand cluster"} maxCharacters={post.platform === "x" ? 280 : 3000} /> : <p className="border-y py-10 text-sm text-muted-foreground"><LocalizedText text="No post drafts yet. Create one from a demand cluster." /></p>}</div>
}
