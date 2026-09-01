import "server-only"

import { Solari } from "@solarisdk/browser"

import { getServerEnv } from "@/lib/env"
import { assertPublicHttpUrl } from "@/solari/browser"
import type { BrowserFetcher } from "@/sources"

export class SolariBrowserFetcher implements BrowserFetcher {
  async fetchPage(
    rawUrl: string,
    input: { signal: AbortSignal; timeoutMs: number },
  ) {
    const requestedUrl = assertPublicHttpUrl(rawUrl)
    const solari = new Solari({ apiKey: getServerEnv().SOLARI_API_KEY })
    let browser: Awaited<ReturnType<Solari["launch"]>> | undefined

    try {
      input.signal.throwIfAborted()
      browser = await solari.launch()
      const page = await browser.newPage()
      await page.goto(requestedUrl.toString(), {
        waitUntil: "domcontentloaded",
        timeout: input.timeoutMs,
      })
      input.signal.throwIfAborted()
      const finalUrl = assertPublicHttpUrl(page.url()).toString()
      const [html, title] = await Promise.all([page.content(), page.title()])

      return {
        html: html.slice(0, 500_000),
        title: title.slice(0, 500),
        finalUrl,
        replayRef: browser.id,
      }
    } finally {
      await browser?.close().catch(() => undefined)
      await solari.close().catch(() => undefined)
    }
  }
}
