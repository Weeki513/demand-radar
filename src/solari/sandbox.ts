import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { SolariClient } from "@solarisdk/sdk"
import { z } from "zod"

import { getServerEnv } from "@/lib/env"

const MAX_INPUT_BYTES = 2_000_000
const processorOutputSchema = z.object({
  pipelineVersion: z.string(),
  rawSignalCount: z.number().int().nonnegative(),
  normalizedSignalCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  normalizedSignals: z.array(z.record(z.string(), z.unknown())).max(2_000),
  clusters: z.array(z.record(z.string(), z.unknown())).max(500),
})

export type ProcessorOutput = z.infer<typeof processorOutputSchema>

export async function processEvidenceInSolariSandbox(input: {
  scanRunId: string
  signals: Array<Record<string, unknown>>
  contextItems: Array<Record<string, unknown>>
  historyByCluster?: Record<string, Array<Record<string, unknown>>>
  now?: string
}): Promise<ProcessorOutput> {
  const payload = JSON.stringify(input)
  if (Buffer.byteLength(payload) > MAX_INPUT_BYTES) {
    throw new Error("Processor input exceeds the 2 MB safety limit")
  }

  const processorSource = await readFile(
    path.join(process.cwd(), "processor", "pipeline.py"),
    "utf8",
  )
  const client = new SolariClient({ apiKey: getServerEnv().SOLARI_API_KEY })
  const sandbox = await client.sandboxes.create({
    template: "base",
    timeoutMs: 2 * 60_000,
    metadata: {
      workload: "demand-radar-processor",
      scanRunId: input.scanRunId,
      processorVersion: "deterministic-v1",
    },
  })

  try {
    await sandbox.connect()
    await Promise.all([
      sandbox.files.write("/tmp/pipeline.py", processorSource),
      sandbox.files.write("/tmp/input.json", payload),
    ])
    const command = await sandbox.commands.run("python3", {
      args: [
        "-c",
        [
          "import json, sys",
          "from datetime import datetime",
          "sys.path.insert(0, '/tmp')",
          "from pipeline import process_evidence",
          "data=json.load(open('/tmp/input.json', encoding='utf-8'))",
          "now=datetime.fromisoformat(data['now'].replace('Z','+00:00')) if data.get('now') else None",
          "result=process_evidence(data['signals'], context_items=data.get('contextItems', []), history_by_cluster=data.get('historyByCluster', {}), now=now)",
          "json.dump(result, open('/tmp/output.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))",
        ].join(";"),
      ],
      timeoutMs: 90_000,
    })
    if (command.exitCode !== 0) {
      throw new Error(`Sandbox processor failed with exit code ${command.exitCode}`)
    }

    return processorOutputSchema.parse(
      JSON.parse(await sandbox.files.readText("/tmp/output.json")),
    )
  } finally {
    await sandbox.kill().catch(() => undefined)
  }
}
