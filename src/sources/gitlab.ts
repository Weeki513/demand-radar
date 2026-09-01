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
import { asRecord, configStrings, maxItems, maxPages, pageSize, optionalNumber, sourceInstance } from "./adapter-utils";

export function parseGitLabIssues(
  payload: unknown,
  config: SourceConfig,
  cutoff: Date,
  now = new Date(),
  requestUrl = "https://gitlab.com/api/v4/projects",
): ReturnType<typeof makeEvidence>[] {
  const result: ReturnType<typeof makeEvidence>[] = [];
  for (const raw of Array.isArray(payload) ? payload : []) {
    const issue = asRecord(raw);
    if (!isAfterCutoff(issue.updated_at ?? issue.created_at, cutoff)) continue;
    const id = String(issue.id ?? issue.iid ?? "");
    const url = String(issue.web_url ?? "");
    if (!id || !url) continue;
    const author = asRecord(issue.author);
    result.push(
      makeEvidence(
        {
          sourceKind: "gitlab",
          sourceInstanceId: sourceInstance(config),
          externalId: id,
          url,
          title: String(issue.title ?? "GitLab issue"),
          excerpt: String(issue.description ?? issue.title ?? ""),
          authorRef: typeof author.username === "string" ? author.username : undefined,
          publishedAt: String(issue.created_at ?? issue.updated_at ?? ""),
          engagement: normalizedEngagement({
            comments: optionalNumber(issue.user_notes_count),
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

export class GitLabAdapter implements SourceAdapter {
  readonly key = "gitlab";

  supports(config: SourceConfig): boolean {
    return config.adapterKey === this.key || config.adapterKey === "gitlab_issues";
  }

  async collect(input: CollectInput): Promise<AdapterResult> {
    const projects = [...configStrings(input.config, "projects")];
    const project = String(input.config.config.project ?? "").trim();
    if (project) projects.push(project);
    const uniqueProjects = [...new Set(projects)];
    if (uniqueProjects.length === 0) return successful([], ["gitlab: config.project is required"]);
    const apiBase = String(input.config.config.apiBaseUrl ?? "https://gitlab.com/api/v4").replace(/\/$/, "");
    const cutoff = lookbackCutoff(input.lookbackDays, input.now ?? new Date());
    const items: ReturnType<typeof makeEvidence>[] = [];
    for (const projectPath of uniqueProjects.slice(0, 20)) {
      for (let page = 1; page <= maxPages(input.config) && items.length < maxItems(input.config); page += 1) {
        const endpoint = `${apiBase}/projects/${encodeURIComponent(projectPath)}/issues?state=all&order_by=updated_at&sort=desc&per_page=${pageSize(input.config)}&page=${page}`;
        const payload = await requestJson<unknown>(endpoint, input, this.key);
        const pageItems = parseGitLabIssues(payload, input.config, cutoff, input.now ?? new Date(), endpoint);
        items.push(...pageItems);
        if (!Array.isArray(payload) || payload.length < pageSize(input.config) || pageItems.length === 0) break;
      }
    }
    return successful(items.slice(0, maxItems(input.config)), items.length >= maxItems(input.config) ? ["gitlab: maxItems bound reached"] : []);
  }
}

export const gitlabAdapter = new GitLabAdapter();
