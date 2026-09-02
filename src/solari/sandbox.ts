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

async function uploadSandboxFile(sandbox: {
  uploadUrl(path: string): Promise<{ url: string }>
}, filePath: string, contents: string) {
  const signed = await sandbox.uploadUrl(filePath)
  const response = await fetch(signed.url, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: contents,
  })
  if (!response.ok) {
    throw new Error(`Sandbox file upload failed with status ${response.status}`)
  }
}

async function downloadSandboxFile(sandbox: {
  downloadUrl(path: string): Promise<{ url: string }>
}, filePath: string) {
  const signed = await sandbox.downloadUrl(filePath)
  const response = await fetch(signed.url)
  if (!response.ok) {
    throw new Error(`Sandbox file download failed with status ${response.status}`)
  }
  return response.text()
}

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
    timeoutMs: 10 * 60_000,
    metadata: {
      workload: "demand-radar-processor",
      scanRunId: input.scanRunId,
      processorVersion: "deterministic-v1",
    },
  })

  try {
    // Use signed HTTP file transfers so large payloads do not occupy the
    // control channel. Keep the command on the control channel, but emit a
    // heartbeat while it runs: the processor can legitimately be quiet for
    // longer than the gateway's idle window on a cold sandbox.
    await Promise.all([
      uploadSandboxFile(sandbox, "/tmp/pipeline.py", processorSource),
      uploadSandboxFile(sandbox, "/tmp/input.json", payload),
    ])
    await sandbox.connect()
    const command = await sandbox.commands.run("python3", {
      args: [
        "-c",
        [
          "import threading, time",
          "exec(\"def _heartbeat():\\n  while True:\\n    print('processor heartbeat', flush=True)\\n    time.sleep(10)\")",
          "threading.Thread(target=_heartbeat, daemon=True).start()",
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
      throw new Error(
        `Sandbox processor failed with exit code ${command.exitCode}: ${command.stderr.slice(0, 500)}`,
      )
    }

    return processorOutputSchema.parse(
      JSON.parse(await downloadSandboxFile(sandbox, "/tmp/output.json")),
    )
  } finally {
    await sandbox.kill().catch(() => undefined)
  }
}
