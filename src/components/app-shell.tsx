"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType, ReactNode } from "react"
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Box,
  ChevronDown,
  FileText,
  Plus,
  Radar,
  ScanLine,
  Settings2,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { DemoProduct } from "@/lib/demo-data"

type NavItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

function getNavItems(productId: string): NavItem[] {
  return [
    { label: "Product context", href: `/app/${productId}/context`, icon: BookOpen },
    { label: "Demand signals", href: `/app/${productId}/signals`, icon: Radar },
    { label: "Pulse", href: `/app/${productId}/pulse`, icon: Activity },
    { label: "Posts", href: `/app/${productId}/posts`, icon: FileText },
    { label: "Scan history", href: `/app/${productId}/scans`, icon: ScanLine },
    { label: "Settings", href: `/app/${productId}/settings`, icon: Settings2 },
  ]
}

function ProductSwitcher({ product, products }: { product: DemoProduct; products: DemoProduct[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-between rounded-md px-2.5 py-2 text-left"
          aria-label="Switch product"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar size="sm" className="rounded-md">
              <AvatarFallback className="rounded-md bg-foreground text-[10px] text-background">
                {product.initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{product.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{product.url}</span>
            </span>
          </span>
          <ChevronDown aria-hidden data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuGroup>
          {products.map((option) => (
            <DropdownMenuItem key={option.id} asChild>
              <Link href={`/app/${option.id}/signals`}>
                <Avatar size="sm" className="rounded-md">
                  <AvatarFallback className="rounded-md bg-muted text-[10px]">{option.initials}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate">{option.name}</span>
                {option.id === product.id ? <span className="ml-auto text-[10px] text-muted-foreground">Current</span> : null}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/app/new">
            <Plus aria-hidden />
            Add product
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AppSidebar({ product, products }: { product: DemoProduct; products: DemoProduct[] }) {
  const pathname = usePathname()
  const navItems = getNavItems(product.id)

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-sidebar lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-5 py-5 lg:block">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]">
          <span className="flex size-6 items-center justify-center rounded-sm bg-foreground text-background">
            <Box aria-hidden />
          </span>
          demand radar
        </Link>
      </div>

      <div className="px-4 pb-4 lg:px-4">
        <ProductSwitcher product={product} products={products} />
      </div>
      <Separator />

      <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:gap-0.5 lg:px-3 lg:py-5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors [&>svg]:size-3.5",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto hidden px-4 pb-4 lg:block">
        <Separator className="mb-4" />
        <div className="flex items-center gap-2.5 px-1">
          <Avatar size="sm">
            <AvatarFallback className="bg-muted text-xs">AP</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">Anton Pivnev</p>
            <p className="truncate text-[11px] text-muted-foreground">Demo workspace</p>
          </div>
          <Button variant="ghost" size="icon-xs" aria-label="Account settings">
            <Settings2 aria-hidden data-icon="inline-start" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

const pageNames: Record<string, string> = {
  context: "Product context",
  signals: "Demand signals",
  pulse: "Pulse",
  posts: "Posts",
  scans: "Scan history",
  settings: "Settings",
}

function AppHeader({ product }: { product: DemoProduct }) {
  const pathname = usePathname()
  const section = pathname.split("/").filter(Boolean).at(-1) ?? "signals"
  const pageName = pageNames[section] ?? "Workspace"

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b px-5 py-3 sm:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{product.name}</span>
          <span aria-hidden>/</span>
          <span className="text-foreground">{pageName}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Updated from your last scan · Today, 09:14</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
          <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
          Demo data
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Exit demo <ArrowUpRight data-icon="inline-end" /></Link>
        </Button>
      </div>
    </header>
  )
}

export function AppShell({ product, products, children }: { product: DemoProduct; products: DemoProduct[]; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:pl-64">
      <AppSidebar product={product} products={products} />
      <div className="min-h-screen">
        <AppHeader product={product} />
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
