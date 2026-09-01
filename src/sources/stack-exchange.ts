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

export function parseStackExchangeQuestions(
  payload: unknown,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
  requestUrl = "https://api.stackexchange.com/2.3/questions",
): ReturnType<typeof makeEvidence>[] {
  const result: ReturnType<typeof makeEvidence>[] = [];
  for (const raw of Array.isArray(asRecord(payload).items) ? (asRecord(payload).items as unknown[]) : []) {
    const question = asRecord(raw);
    if (!isAfterCutoff(question.last_activity_date ? new Date(Number(question.last_activity_date) * 1000).toISOString() : undefined, cutoff)) continue;
    const id = String(question.question_id ?? "");
    const url = String(question.link ?? "");
    if (!id || !url) continue;
    const owner = asRecord(question.owner);
    const body = String(question.body_markdown ?? question.body ?? question.title ?? "");
    result.push(
      makeEvidence(
        {
          sourceKind: "stack_exchange",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url,
          title: String(question.title ?? "Stack Exchange question"),
          excerpt: body,
          context: Array.isArray(question.tags) ? question.tags.join(", ") : undefined,
          authorRef: typeof owner.display_name === "string" ? owner.display_name : undefined,
          publishedAt: question.creation_date ? new Date(Number(question.creation_date) * 1000).toISOString() : undefined,
          engagement: normalizedEngagement({
            score: optionalNumber(question.score),
            comments: optionalNumber(question.answer_count),
            views: optionalNumber(question.view_count),
          }),
          requestUrl,
          transport: "api",
          rawPayload: question,
        },
        now,
      ),
    );
  }
  return result;
}

export class StackExchangeAdapter implements SourceAdapter {
  readonly key = "stack_exchange";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key || config.adapterKey === "stackexchange";
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const site = String(configValue(input.config, "site", "stackoverflow")).trim();
    if (!site) return successful([], ["stack_exchange: config.site is required"]);
    const apiBase = String(configValue(input.config, "apiBaseUrl", "https://api.stackexchange.com/2.3")).replace(/\/$/, "");
    const cutoff = lookbackCutoff(input.lookbackDays, input.now ?? new Date());
    const items: ReturnType<typeof makeEvidence>[] = [];
    for (let page = 1; page <= maxPages(input.config) && items.length < maxItems(input.config); page += 1) {
      const endpoint = new URL(`${apiBase}/questions`);
      endpoint.searchParams.set("site", site);
      endpoint.searchParams.set("order", "desc");
      endpoint.searchParams.set("sort", "activity");
      endpoint.searchParams.set("filter", "withbody");
      endpoint.searchParams.set("pagesize", String(pageSize(input.config)));
      endpoint.searchParams.set("page", String(page));
      const tags = configValue(input.config, "tagged", "");
      if (tags) endpoint.searchParams.set("tagged", String(tags));
      const payload = await requestJson<unknown>(endpoint.toString(), input, this.key);
      const pageItems = parseStackExchangeQuestions(payload, input.config, cutoff, input.now ?? new Date(), endpoint.toString());
      items.push(...pageItems);
      const values = asRecord(payload).items;
      if (!Array.isArray(values) || values.length < pageSize(input.config) || pageItems.length === 0) break;
    }
    return successful(items.slice(0, maxItems(input.config)), items.length >= maxItems(input.config) ? ["stack_exchange: maxItems bound reached"] : []);
  }
}

export const stackExchangeAdapter = new StackExchangeAdapter();
