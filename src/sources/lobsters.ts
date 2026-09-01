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
import { asRecord, configValue, maxItems, sourceInstance } from "./adapter-utils";

export function parseLobstersStories(
  payload: unknown,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
  requestUrl = "https://lobste.rs/newest.json",
): ReturnType<typeof makeEvidence>[] {
  const result: ReturnType<typeof makeEvidence>[] = [];
  for (const raw of Array.isArray(payload) ? payload : []) {
    const story = asRecord(raw);
    if (!isAfterCutoff(story.created_at, cutoff)) continue;
    const id = String(story.short_id ?? story.id ?? "");
    const url = String(story.comments_url ?? story.url ?? "");
    if (!id || !url) continue;
    result.push(
      makeEvidence(
        {
          sourceKind: "lobsters",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url,
          title: String(story.title ?? "Lobsters story"),
          excerpt: String(story.description ?? story.title ?? ""),
          context: Array.isArray(story.tags) ? story.tags.map(String).join(", ") : undefined,
          authorRef: typeof story.submitter_user === "string" ? story.submitter_user : undefined,
          publishedAt: String(story.created_at),
          engagement: normalizedEngagement({
            score: typeof story.score === "number" ? story.score : undefined,
            comments: typeof story.comment_count === "number" ? story.comment_count : undefined,
          }),
          requestUrl,
          transport: "api",
          rawPayload: story,
        },
        now,
      ),
    );
  }
  return result;
}

export class LobstersAdapter implements SourceAdapter {
  readonly key = "lobsters";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key;
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const baseUrl = String(configValue(input.config, "baseUrl", "https://lobste.rs")).replace(/\/$/, "");
    const tag = String(configValue(input.config, "tag", "")).trim();
    const endpoint = tag ? `${baseUrl}/tags/${encodeURIComponent(tag)}.json` : `${baseUrl}/newest.json`;
    const payload = await requestJson<unknown>(endpoint, input, this.key);
    const items = parseLobstersStories(payload, input.config, lookbackCutoff(input.lookbackDays, input.now ?? new Date()), input.now ?? new Date(), endpoint);
    return successful(items.slice(0, maxItems(input.config)), items.length > maxItems(input.config) ? ["lobsters: maxItems bound reached"] : []);
  }
}

export const lobstersAdapter = new LobstersAdapter();
