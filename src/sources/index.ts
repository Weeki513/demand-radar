import type { AdapterResult, SourceConfig } from "../domain/contracts";
import { isolatedCollect, type CollectInput, type SourceAdapter } from "./contracts";
import { devAdapter } from "./dev";
import { discourseAdapter, cannyAdapter, githubDiscussionsAdapter, productHuntAdapter } from "./browser-configurable";
import { gitlabAdapter } from "./gitlab";
import { githubIssuesAdapter } from "./github-issues";
import { hackerNewsAdapter } from "./hacker-news";
import { lobstersAdapter } from "./lobsters";
import { rssAtomAdapter } from "./rss-atom";
import { stackExchangeAdapter } from "./stack-exchange";

export {
  type BrowserFetcher,
  type BrowserPage,
  type CollectInput,
  type EvidenceDraft,
  type SourceAdapter,
  SourceHttpError,
  canonicalizeUrl,
  cleanText,
  makeEvidence,
  normalizedEngagement,
  requestJson,
  requestText,
} from "./contracts";
export * from "./browser-configurable";
export * from "./dev";
export * from "./gitlab";
export * from "./github-issues";
export * from "./hacker-news";
export * from "./lobsters";
export * from "./rss-atom";
export * from "./stack-exchange";

export const sourceAdapters: readonly SourceAdapter[] = [
  hackerNewsAdapter,
  githubIssuesAdapter,
  githubDiscussionsAdapter,
  stackExchangeAdapter,
  devAdapter,
  lobstersAdapter,
  rssAtomAdapter,
  gitlabAdapter,
  discourseAdapter,
  cannyAdapter,
  productHuntAdapter,
];

export interface SourceCollectionOutcome {
  configId: string;
  adapterKey: string;
  result: AdapterResult;
  failed: boolean;
}

/** Collect enabled sources independently; one network failure never rejects the scan. */
export async function collectSources(
  configs: readonly SourceConfig[],
  options: Omit<CollectInput, "config">,
  adapters: readonly SourceAdapter[] = sourceAdapters,
): Promise<SourceCollectionOutcome[]> {
  const boundedConfigs = configs.filter((config) => config.enabled).slice(0, 20);
  return Promise.all(
    boundedConfigs.map(async (config): Promise<SourceCollectionOutcome> => {
      const adapter = adapters.find((candidate) => candidate.supports(config));
      if (!adapter) {
        return {
          configId: config.id,
          adapterKey: config.adapterKey,
          result: { items: [], warnings: [`${config.adapterKey}: no adapter registered`] },
          failed: true,
        };
      }
      try {
        const result = await isolatedCollect(adapter, { ...options, config });
        return { configId: config.id, adapterKey: adapter.key, result, failed: result.items.length === 0 && result.warnings.length > 0 };
      } catch {
        // isolatedCollect currently converts failures to warnings; this guard keeps the contract future-proof.
        return {
          configId: config.id,
          adapterKey: adapter.key,
          result: { items: [], warnings: [`${adapter.key}: collection failed`] },
          failed: true,
        };
      }
    }),
  );
}
