import type { AdapterResult, SourceConfig, SourceKind } from "../domain/contracts";
import {
  isAfterCutoff,
  lookbackCutoff,
  makeEvidence,
  normalizedEngagement,
  successful,
  type BrowserPage,
  type CollectInput,
  type SourceAdapter,
} from "./contracts";
import { configValue, maxItems, sourceInstance } from "./adapter-utils";

const DYNAMIC_CONFIGS: Record<string, { kind: SourceKind; aliases: string[] }> = {
  github_discussions_browser: { kind: "github_discussions", aliases: ["github_discussions"] },
  discourse_browser: { kind: "discourse", aliases: ["discourse"] },
  canny_browser: { kind: "canny", aliases: ["canny"] },
  product_hunt_browser: { kind: "product_hunt", aliases: ["product_hunt"] },
};

function htmlField(html: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(html)?.[1];
  return match?.replace(/<[^>]+>/g, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}

function canonicalFromHtml(html: string): string | undefined {
  return /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1];
}

function pageBlocks(html: string): string[] {
  const blocks = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((match) => match[0]);
  return blocks.length > 0 ? blocks : [html];
}

export function parseBrowserPage(
  page: BrowserPage,
  config: SourceConfig,
  sourceKind: SourceKind,
  cutoff: Date,
  now = new Date(),
  requestUrl = "",
): ReturnType<typeof makeEvidence>[] {
  const result: ReturnType<typeof makeEvidence>[] = [];
  const pageTitle = page.title || htmlField(page.html, /<title\b[^>]*>([\s\S]*?)<\/title>/i) || `${sourceKind} public page`;
  const pageDescription = htmlField(page.html, /<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["'][^>]*>/i) || pageTitle;
  const pageDate = htmlField(page.html, /<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i);
  for (const [index, block] of pageBlocks(page.html).entries()) {
    const publishedAt = htmlField(block, /<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i) || pageDate;
    if (publishedAt && !isAfterCutoff(publishedAt, cutoff)) continue;
    const title = htmlField(block, /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i) || pageTitle;
    const excerpt = htmlField(block, /<p\b[^>]*>([\s\S]*?)<\/p>/i) || pageDescription;
    const itemUrl = htmlField(block, /<a\b[^>]*href=["']([^"']+)["'][^>]*>/i) || canonicalFromHtml(page.html) || page.finalUrl || requestUrl;
    const externalId = htmlField(block, /\b(?:data-discussion-id|data-topic-id|data-post-id|data-id)=["']([^"']+)["']/i) || `${itemUrl}#${index}`;
    if (!itemUrl || !title || !excerpt) continue;
    result.push(
      makeEvidence(
        {
          sourceKind,
          sourceInstanceId: sourceInstance(config),
          externalId,
          url: itemUrl,
          title,
          excerpt,
          publishedAt,
          engagement: normalizedEngagement({}),
          requestUrl,
          finalUrl: page.finalUrl,
          replayRef: page.replayRef,
          transport: "solari_browser",
          rawPayload: { title, externalId, finalUrl: page.finalUrl },
        },
        now,
      ),
    );
  }
  return result;
}

export class BrowserConfigurableAdapter implements SourceAdapter {
  readonly key: string;
  readonly sourceKind: SourceKind;
  private readonly acceptedKeys: Set<string>;

  constructor(key: string, sourceKind: SourceKind, aliases: readonly string[] = []) {
    this.key = key;
    this.sourceKind = sourceKind;
    this.acceptedKeys = new Set([key, ...aliases]);
  }

  supports(config: SourceConfig): boolean {
    return this.acceptedKeys.has(config.adapterKey);
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const url = String(configValue(input.config, "url", "")).trim();
    if (!url) return successful([], [`${this.key}: config.url is required`]);
    if (!input.browser) return successful([], [`${this.key}: browser fetcher is required for dynamic pages`]);
    const page = await input.browser.fetchPage(url, { signal: input.signal, timeoutMs: input.timeoutMs ?? 8_000 });
    const items = parseBrowserPage(page, input.config, this.sourceKind, lookbackCutoff(input.lookbackDays, input.now ?? new Date()), input.now ?? new Date(), url);
    return successful(items.slice(0, maxItems(input.config)), items.length > maxItems(input.config) ? [`${this.key}: maxItems bound reached`] : []);
  }
}

export const browserConfigurableAdapters = Object.entries(DYNAMIC_CONFIGS).map(
  ([key, value]) => new BrowserConfigurableAdapter(key, value.kind, value.aliases),
);

export const githubDiscussionsAdapter = browserConfigurableAdapters.find((adapter) => adapter.key === "github_discussions_browser")!;
export const discourseAdapter = browserConfigurableAdapters.find((adapter) => adapter.key === "discourse_browser")!;
export const cannyAdapter = browserConfigurableAdapters.find((adapter) => adapter.key === "canny_browser")!;
export const productHuntAdapter = browserConfigurableAdapters.find((adapter) => adapter.key === "product_hunt_browser")!;
