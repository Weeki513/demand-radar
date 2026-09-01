import type { AdapterResult, SourceConfig } from "../domain/contracts";
import {
  isAfterCutoff,
  lookbackCutoff,
  makeEvidence,
  normalizedEngagement,
  requestText,
  successful,
  type CollectInput,
  type SourceAdapter,
} from "./contracts";
import { configValue, maxItems, sourceInstance } from "./adapter-utils";

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const parsed = code.toLowerCase().startsWith("x") ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function xmlText(block: string, name: string): string | undefined {
  const expression = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const result = expression.exec(block)?.[1];
  return result ? decodeXml(result).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : undefined;
}

function xmlLink(block: string): string | undefined {
  const href = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
  return href ? decodeXml(href) : xmlText(block, "link");
}

export function parseRssAtom(
  xml: string,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
  requestUrl = "",
): ReturnType<typeof makeEvidence>[] {
  const result: ReturnType<typeof makeEvidence>[] = [];
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  for (const block of blocks) {
    const publishedAt = xmlText(block, "pubDate") ?? xmlText(block, "published") ?? xmlText(block, "updated") ?? xmlText(block, "dc:date");
    if (!isAfterCutoff(publishedAt, cutoff)) continue;
    const title = xmlText(block, "title") ?? "RSS/Atom item";
    const excerpt = xmlText(block, "description") ?? xmlText(block, "summary") ?? xmlText(block, "content:encoded") ?? title;
    const url = xmlLink(block) ?? requestUrl;
    const id = xmlText(block, "guid") ?? xmlText(block, "id") ?? url;
    if (!url || !id) continue;
    result.push(
      makeEvidence(
        {
          sourceKind: "rss_atom",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url,
          title,
          excerpt,
          authorRef: xmlText(block, "author") ?? xmlText(block, "dc:creator"),
          publishedAt,
          engagement: normalizedEngagement({}),
          requestUrl,
          transport: "rss",
          rawPayload: { title, publishedAt, url },
        },
        now,
      ),
    );
  }
  return result;
}

export class RssAtomAdapter implements SourceAdapter {
  readonly key = "rss_atom";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key || config.adapterKey === "rss" || config.adapterKey === "atom";
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const feedUrl = String(configValue(input.config, "feedUrl", "")).trim();
    if (!feedUrl) return successful([], ["rss_atom: config.feedUrl is required"]);
    const xml = await requestText(feedUrl, input, this.key);
    const items = parseRssAtom(xml, input.config, lookbackCutoff(input.lookbackDays, input.now ?? new Date()), input.now ?? new Date(), feedUrl);
    return successful(items.slice(0, maxItems(input.config)), items.length > maxItems(input.config) ? ["rss_atom: maxItems bound reached"] : []);
  }
}

export const rssAtomAdapter = new RssAtomAdapter();
