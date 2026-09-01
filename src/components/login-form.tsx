import Link from "next/link"
import { ArrowRight, Radar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  return (
    <main className="flex min-h-screen flex-col bg-background px-6 py-6">
      <header><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]"><span className="flex size-6 items-center justify-center rounded-sm bg-foreground text-background"><Radar aria-hidden /></span> demand radar</Link></header>
      <div className="flex flex-1 items-center justify-center py-20"><div className="w-full max-w-sm"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Private workspace</p><h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Sign in</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Continue to your demand history and product context.</p><form className="mt-8 flex flex-col gap-6" action="/api/auth/login" method="post"><FieldGroup><Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></Field><Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required /><FieldDescription>Email and password are handled by Supabase Auth.</FieldDescription></Field></FieldGroup><Button type="submit" className="w-full">Sign in <ArrowRight data-icon="inline-end" /></Button></form><div className="mt-8 flex items-center justify-between border-t pt-5 text-xs text-muted-foreground"><form action="/api/demo/login" method="post"><button className="text-foreground hover:underline" type="submit">Explore demo</button></form><Link href="/" className="hover:text-foreground">Back home</Link></div></div></div>
    </main>
  )
}
