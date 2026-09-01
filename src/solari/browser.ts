import "server-only"

import { Solari } from "@solarisdk/browser"

import { getServerEnv } from "@/lib/env"

const MAX_PRODUCT_TEXT = 20_000

export function assertPublicHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("Only public HTTP(S) URLs are supported")
  }
  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not supported")
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  const blocked =
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

  if (blocked) throw new Error("Private network URLs are not supported")
  return url
}

export async function readPublicProductPage(rawUrl: string) {
  const requestedUrl = assertPublicHttpUrl(rawUrl)
  const solari = new Solari({ apiKey: getServerEnv().SOLARI_API_KEY })
  let browser: Awaited<ReturnType<Solari["launch"]>> | undefined

  try {
    browser = await solari.launch()
    const page = await browser.newPage()
    await page.goto(requestedUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    })
    const finalUrl = assertPublicHttpUrl(page.url())
    const [title, description, body] = await Promise.all([
      page.title(),
      page
        .locator('meta[name="description"]')
        .getAttribute("content")
        .catch(() => null),
      page.locator("body").innerText({ timeout: 10_000 }),
    ])

    return {
      requestedUrl: requestedUrl.toString(),
      finalUrl: finalUrl.toString(),
      title: title.slice(0, 500),
      description: description?.slice(0, 2_000) ?? "",
      text: body.replace(/\s+/g, " ").trim().slice(0, MAX_PRODUCT_TEXT),
      retrievedAt: new Date().toISOString(),
      transport: "solari-browser" as const,
      sessionReference: browser.id,
    }
  } finally {
    await browser?.close().catch(() => undefined)
    await solari.close().catch(() => undefined)
  }
}
