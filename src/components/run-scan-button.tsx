"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/i18n"

export function RunScanButton({ productId }: { productId: string }) {
  const [state, setState] = useState<"idle" | "running" | "error">("idle")
  const { t } = useLocale()
  const router = useRouter()

  async function run() {
    try {
      setState("idle")
      const response = await fetch("/api/scans/enqueue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, trigger: "manual" }),
      })
      if (!response.ok) {
        setState("error")
        return
      }
      const body = (await response.json().catch(() => null)) as { run?: { id?: string } } | null
      const runId = body?.run?.id
      if (!runId) {
        setState("idle")
        router.refresh()
        return
      }
      setState("running")
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3_000))
        const statusResponse = await fetch(`/api/scans/status?runId=${encodeURIComponent(runId)}`)
        if (!statusResponse.ok) {
          setState("error")
          return
        }
        const statusBody = (await statusResponse.json()) as { run?: { status?: string } }
        const scanStatus = statusBody.run?.status
        if (scanStatus === "completed" || scanStatus === "failed") {
          setState(scanStatus === "failed" ? "error" : "idle")
          router.refresh()
          return
        }
      }
    } catch {
      setState("error")
    }
  }

  return <Button type="button" onClick={() => void run()} disabled={state === "running"}>{t(state === "running" ? "Scanning…" : state === "error" ? "Retry scan" : "Run now")}</Button>
}
