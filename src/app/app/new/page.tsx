import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function NewProductPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">New workspace</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Add a product</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Start with its public surface. You can review and refine the product model before any scan runs.</p>
      <form action="/api/products" method="post" className="mt-10 flex flex-col gap-7">
        <FieldGroup>
          <Field><FieldLabel htmlFor="name">Product name</FieldLabel><Input id="name" name="name" required maxLength={120} /></Field>
          <Field><FieldLabel htmlFor="publicUrl">Public URL</FieldLabel><Input id="publicUrl" name="publicUrl" type="url" required placeholder="https://example.com" /><FieldDescription>Demand Radar can analyze this public page after creation.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="additionalContext">Additional context</FieldLabel><Textarea id="additionalContext" name="additionalContext" rows={5} placeholder="Who it is for and what it helps them do." /></Field>
        </FieldGroup>
        <div className="flex justify-end gap-3 border-t pt-5"><Button variant="ghost" asChild><Link href="/">Cancel</Link></Button><Button type="submit">Create product</Button></div>
      </form>
    </main>
  )
}
