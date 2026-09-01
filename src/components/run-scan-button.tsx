"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export function RunScanButton({ productId }: { productId: string }) {
  const [state, setState] = useState<"idle" | "queued" | "error">("idle")

  async function run() {
    setState("idle")
    const response = await fetch("/api/scans/enqueue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, trigger: "manual" }),
    })
    setState(response.ok ? "queued" : "error")
  }

  return <Button type="button" onClick={run} disabled={state === "queued"}>{state === "queued" ? "Scan queued" : state === "error" ? "Retry scan" : "Run now"}</Button>
}
