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
import { asRecord, configValue, maxItems, maxPages, pageSize, optionalNumber, sourceInstance } from "./adapter-utils";

export function parseDevArticles(
  payload: unknown,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
  requestUrl = "https://dev.to/api/articles",
): ReturnType<typeof makeEvidence>[] {
  const result: ReturnType<typeof makeEvidence>[] = [];
  for (const raw of Array.isArray(payload) ? payload : []) {
    const article = asRecord(raw);
    if (!isAfterCutoff(article.published_at ?? article.created_at, cutoff)) continue;
    const id = String(article.id ?? "");
    const url = String(article.url ?? "");
    if (!id || !url) continue;
    const user = asRecord(article.user);
    const tags = Array.isArray(article.tag_list) ? article.tag_list.map(String).join(", ") : undefined;
    result.push(
      makeEvidence(
        {
          sourceKind: "dev",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url,
          title: String(article.title ?? "DEV article"),
          excerpt: String(article.description ?? article.title ?? ""),
          context: tags,
          authorRef: typeof user.username === "string" ? user.username : undefined,
          publishedAt: String(article.published_at ?? article.created_at ?? ""),
          engagement: normalizedEngagement({
            reactions: optionalNumber(article.positive_reactions_count),
            comments: optionalNumber(article.comments_count),
            views: optionalNumber(article.page_views_count),
          }),
          requestUrl,
          transport: "api",
          rawPayload: article,
        },
        now,
      ),
    );
  }
  return result;
}

export class DevAdapter implements SourceAdapter {
  readonly key = "dev";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key || config.adapterKey === "forem";
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const apiBase = String(configValue(input.config, "apiBaseUrl", "https://dev.to/api")).replace(/\/$/, "");
    const cutoff = lookbackCutoff(input.lookbackDays, input.now ?? new Date());
    const items: ReturnType<typeof makeEvidence>[] = [];
    const tag = String(configValue(input.config, "tag", "")).trim();
    for (let page = 1; page <= maxPages(input.config) && items.length < maxItems(input.config); page += 1) {
      const endpoint = new URL(`${apiBase}/articles`);
      endpoint.searchParams.set("per_page", String(pageSize(input.config)));
      endpoint.searchParams.set("page", String(page));
      if (tag) endpoint.searchParams.set("tag", tag);
      const payload = await requestJson<unknown>(endpoint.toString(), input, this.key);
      const pageItems = parseDevArticles(payload, input.config, cutoff, input.now ?? new Date(), endpoint.toString());
      items.push(...pageItems);
      if (!Array.isArray(payload) || payload.length < pageSize(input.config) || pageItems.length === 0) break;
    }
    return successful(items.slice(0, maxItems(input.config)), items.length >= maxItems(input.config) ? ["dev: maxItems bound reached"] : []);
  }
}

export const devAdapter = new DevAdapter();
