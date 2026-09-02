import Link from "next/link"
import { ArrowRight, Radar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const errors: Record<string, string> = {
  "invalid-input": "Enter a valid email and a password with at least 8 characters.",
  "already-registered": "An account with this email already exists. Sign in instead.",
  "signup-failed": "We could not create the account. Please try again.",
}

export function SignupForm({ error }: { error?: string }) {
  return <main className="flex min-h-screen flex-col bg-background px-6 py-6">
    <header><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]"><span className="flex size-6 items-center justify-center rounded-sm bg-foreground text-background"><Radar aria-hidden /></span> demand radar</Link></header>
    <div className="flex flex-1 items-center justify-center py-20"><div className="w-full max-w-sm"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Private workspace</p><h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Create account</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Start a private Demand Radar workspace.</p>{error && errors[error] ? <p className="mt-5 border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errors[error]}</p> : null}<form className="mt-8 flex flex-col gap-6" action="/api/auth/signup" method="post"><FieldGroup><Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></Field><Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required /><FieldDescription>Use at least 8 characters.</FieldDescription></Field></FieldGroup><Button type="submit" className="w-full">Create account <ArrowRight data-icon="inline-end" /></Button></form><div className="mt-8 border-t pt-5 text-xs text-muted-foreground">Already have an account? <Link href="/login" className="text-foreground hover:underline">Sign in</Link></div></div></div>
  </main>
}
