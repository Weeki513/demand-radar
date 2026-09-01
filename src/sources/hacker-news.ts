import type { AdapterResult, SourceConfig } from "../domain/contracts";
import {
  isAfterCutoff,
  lookbackCutoff,
  makeEvidence,
  normalizedEngagement,
  requestJson,
  successful,
  type CollectInput,
  type SourceAdapter,
} from "./contracts";
import { asRecord, configValue, maxItems, maxPages, pageSize, sourceInstance } from "./adapter-utils";

interface AlgoliaHit {
  objectID?: string;
  title?: string;
  story_title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  story_url?: string;
  created_at?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  _tags?: string[];
}

export function parseHackerNewsHits(
  payload: unknown,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
): ReturnType<typeof makeEvidence>[] {
  const root = asRecord(payload);
  const hits = Array.isArray(root.hits) ? root.hits : [];
  const result: ReturnType<typeof makeEvidence>[] = [];
  for (const raw of hits) {
    const hit = asRecord(raw) as AlgoliaHit;
    if (!isAfterCutoff(hit.created_at, cutoff)) continue;
    const id = String(hit.objectID ?? "");
    if (!id) continue;
    const isComment = hit._tags?.includes("comment");
    const title = hit.title || hit.story_title || (isComment ? "Hacker News comment" : "Hacker News story");
    const excerpt = hit.comment_text || hit.story_text || title;
    result.push(
      makeEvidence(
        {
          sourceKind: "hacker_news",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url: hit.url || hit.story_url || `https://news.ycombinator.com/item?id=${encodeURIComponent(id)}`,
          title,
          excerpt,
          authorRef: hit.author,
          publishedAt: hit.created_at,
          engagement: normalizedEngagement({ score: hit.points, comments: hit.num_comments }),
          requestUrl: "https://hn.algolia.com/api/v1/search_by_date",
          transport: "api",
          rawPayload: hit,
        },
        now,
      ),
    );
  }
  return result;
}

export class HackerNewsAdapter implements SourceAdapter {
  readonly key = "hacker_news_algolia";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key || config.adapterKey === "hacker_news" || config.adapterKey === "hn_algolia";
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const query = String(configValue(input.config, "query", "")).trim();
    if (!query) return successful([], ["hacker_news_algolia: config.query is required"]);
    const cutoff = lookbackCutoff(input.lookbackDays, input.now ?? new Date());
    const baseUrl = String(configValue(input.config, "baseUrl", "https://hn.algolia.com/api/v1/search_by_date"));
    const items: ReturnType<typeof makeEvidence>[] = [];
    const warnings: string[] = [];
    for (let page = 0; page < maxPages(input.config) && items.length < maxItems(input.config); page += 1) {
      const url = new URL(baseUrl);
      url.searchParams.set("query", query);
      url.searchParams.set("tags", String(configValue(input.config, "tags", "story,comment")));
      url.searchParams.set("hitsPerPage", String(pageSize(input.config)));
      url.searchParams.set("page", String(page));
      const payload = await requestJson<unknown>(url.toString(), input, this.key);
      const pageItems = parseHackerNewsHits(payload, input.config, cutoff, input.now ?? new Date());
      items.push(...pageItems);
      const hits = asRecord(payload).hits;
      if (!Array.isArray(hits) || hits.length < pageSize(input.config)) break;
      if (pageItems.length === 0 && page > 0) break;
    }
    if (items.length >= maxItems(input.config)) warnings.push("hacker_news_algolia: maxItems bound reached");
    return successful(items.slice(0, maxItems(input.config)), warnings);
  }
}

export const hackerNewsAdapter = new HackerNewsAdapter();
