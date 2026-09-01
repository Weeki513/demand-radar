import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { getServerEnv } from "@/lib/env"
import { runOneWorkerUnit } from "@/scans/worker"

export const runtime = "nodejs"
export const maxDuration = 300

function authorized(request: Request) {
  const expected = `Bearer ${getServerEnv().WORKER_SECRET}`
  const actual = request.headers.get("authorization") ?? ""
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runOneWorkerUnit()
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Worker failed" },
      { status: 500 },
    )
  }
}
