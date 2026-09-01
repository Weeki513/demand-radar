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
import { asRecord, configStrings, maxItems, maxPages, pageSize, sourceInstance } from "./adapter-utils";

export function parseGitHubIssues(
  payload: unknown,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
  requestUrl = "https://api.github.com/repos",
): ReturnType<typeof makeEvidence>[] {
  const values = Array.isArray(payload) ? payload : [];
  const result: ReturnType<typeof makeEvidence>[] = [];
  for (const raw of values) {
    const issue = asRecord(raw);
    // GitHub returns pull requests in the issues endpoint; they are not demand signals here.
    if (issue.pull_request) continue;
    if (!isAfterCutoff(issue.updated_at ?? issue.created_at, cutoff)) continue;
    const id = String(issue.node_id ?? issue.id ?? "");
    const url = String(issue.html_url ?? "");
    if (!id || !url) continue;
    const reactions = asRecord(issue.reactions);
    result.push(
      makeEvidence(
        {
          sourceKind: "github_issues",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url,
          title: String(issue.title ?? "GitHub issue"),
          excerpt: String(issue.body ?? issue.title ?? ""),
          authorRef: asRecord(issue.user).login as string | undefined,
          publishedAt: String(issue.created_at ?? issue.updated_at ?? ""),
          engagement: normalizedEngagement({
            score: typeof issue.score === "number" ? issue.score : undefined,
            comments: typeof issue.comments === "number" ? issue.comments : undefined,
            reactions: typeof reactions.total_count === "number" ? reactions.total_count : undefined,
          }),
          requestUrl,
          transport: "api",
          rawPayload: issue,
        },
        now,
      ),
    );
  }
  return result;
}

export class GitHubIssuesAdapter implements SourceAdapter {
  readonly key = "github_issues";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key;
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const repositories = configStrings(input.config, "repositories");
    const single = String(input.config.config.repository ?? "").trim();
    if (single) repositories.push(single);
    const uniqueRepositories = [...new Set(repositories)];
    if (uniqueRepositories.length === 0) return successful([], ["github_issues: config.repository is required"]);
    const apiBase = String(input.config.config.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    const cutoff = lookbackCutoff(input.lookbackDays, input.now ?? new Date());
    const items: ReturnType<typeof makeEvidence>[] = [];
    for (const repository of uniqueRepositories.slice(0, 20)) {
      for (let page = 1; page <= maxPages(input.config) && items.length < maxItems(input.config); page += 1) {
        const endpoint = `${apiBase}/repos/${repository.replace(/^\/+|\/+$/g, "")}/issues?state=all&sort=updated&direction=desc&per_page=${pageSize(input.config)}&page=${page}`;
        const payload = await requestJson<unknown>(endpoint, input, this.key);
        const pageItems = parseGitHubIssues(payload, input.config, cutoff, input.now ?? new Date(), endpoint);
        items.push(...pageItems);
        if (!Array.isArray(payload) || payload.length < pageSize(input.config) || pageItems.length === 0) break;
      }
    }
    return successful(items.slice(0, maxItems(input.config)), items.length >= maxItems(input.config) ? ["github_issues: maxItems bound reached"] : []);
  }
}

export const githubIssuesAdapter = new GitHubIssuesAdapter();
