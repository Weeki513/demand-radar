import assert from "node:assert/strict";
import test from "node:test";
import { parseDevArticles } from "../../src/sources/dev";
import { parseGitHubIssues } from "../../src/sources/github-issues";
import { parseHackerNewsHits } from "../../src/sources/hacker-news";
import { parseLobstersStories } from "../../src/sources/lobsters";
import { parseRssAtom } from "../../src/sources/rss-atom";
import { parseStackExchangeQuestions } from "../../src/sources/stack-exchange";
import { parseGitLabIssues } from "../../src/sources/gitlab";
import { parseBrowserPage } from "../../src/sources/browser-configurable";
import { collectSources } from "../../src/sources";
import type { SourceConfig } from "../../src/domain/contracts";

const now = new Date("2026-09-01T00:00:00.000Z");
const cutoff = new Date("2026-08-25T00:00:00.000Z");
const config = (adapterKey: string): SourceConfig => ({
  id: `fixture-${adapterKey}`,
  productId: "product-fixture",
  adapterKey,
  displayName: adapterKey,
  enabled: true,
  config: {},
});

test("parses Hacker News Algolia hits with provenance", () => {
  const [item] = parseHackerNewsHits({ hits: [{ objectID: "1", title: "Auth sessions", comment_text: "Keep login after restart", url: "https://news.ycombinator.com/item?id=1", created_at: "2026-08-31T00:00:00Z", points: 4, num_comments: 2 }] }, config("hacker_news"), cutoff, now);
  assert.equal(item.sourceKind, "hacker_news");
  assert.equal(item.provenance.transport, "api");
  assert.equal(item.engagement.comments, 2);
});

test("parses API adapters and excludes old records or pull requests", () => {
  assert.equal(parseGitHubIssues([{ id: 1, html_url: "https://github.com/a/b/issues/1", title: "Need it", body: "Please add it", updated_at: "2026-08-30T00:00:00Z" }, { id: 2, pull_request: {}, html_url: "https://github.com/a/b/pull/2", title: "PR", updated_at: "2026-08-30T00:00:00Z" }, { id: 3, html_url: "https://github.com/a/b/issues/3", title: "Old", updated_at: "2026-01-01T00:00:00Z" }], config("github_issues"), cutoff, now).length, 1);
  assert.equal(parseStackExchangeQuestions({ items: [{ question_id: 1, link: "https://stackoverflow.com/q/1", title: "Question", body: "Body", last_activity_date: 1_788_048_000, creation_date: 1_788_048_000 }] }, config("stack_exchange"), cutoff, now).length, 1);
  assert.equal(parseDevArticles([{ id: 1, url: "https://dev.to/a/1", title: "Article", description: "Body", published_at: "2026-08-30T00:00:00Z" }], config("dev"), cutoff, now).length, 1);
  assert.equal(parseLobstersStories([{ short_id: "x", comments_url: "https://lobste.rs/s/x", title: "Story", created_at: "2026-08-30T00:00:00Z" }], config("lobsters"), cutoff, now).length, 1);
  assert.equal(parseGitLabIssues([{ id: 1, web_url: "https://gitlab.com/a/b/-/issues/1", title: "Issue", description: "Body", updated_at: "2026-08-30T00:00:00Z" }], config("gitlab"), cutoff, now).length, 1);
});

test("bounds long evidence excerpts to the persisted database limit", () => {
  const [item] = parseGitHubIssues([{ id: 4, html_url: "https://github.com/a/b/issues/4", title: "Long issue", body: "x".repeat(9_000), updated_at: "2026-08-30T00:00:00Z" }], config("github_issues"), cutoff, now);
  assert.equal(item.excerpt.length, 5_000);
});

test("parses RSS/Atom and browser page fixtures", () => {
  const xml = `<feed><entry><id>entry-1</id><title>Forum request</title><link href="https://example.com/post/1"/><summary>Need persistent sessions</summary><updated>2026-08-30T00:00:00Z</updated></entry></feed>`;
  const [rss] = parseRssAtom(xml, config("rss_atom"), cutoff, now, "https://example.com/feed.xml");
  assert.equal(rss.sourceKind, "rss_atom");
  const [browser] = parseBrowserPage({ html: `<html><head><title>Discourse</title><meta name="description" content="Public requests"/></head><body><article data-topic-id="topic-1"><h2>Keep sessions</h2><p>Need login state after restart</p><time datetime="2026-08-30T00:00:00Z"></time></article></body></html>`, finalUrl: "https://forum.example/t/1", title: "Discourse" }, config("discourse_browser"), "discourse", cutoff, now, "https://forum.example");
  assert.equal(browser.provenance.transport, "solari_browser");
  assert.equal(browser.externalId, "topic-1");
});

test("isolates a failed source while allowing another source to complete", async () => {
  const failing = {
    key: "fixture-failing",
    supports: (candidate: SourceConfig) => candidate.adapterKey === "fixture-failing",
    collect: async () => {
      throw new Error("fixture network failure");
    },
  };
  const succeeding = {
    key: "fixture-success",
    supports: (candidate: SourceConfig) => candidate.adapterKey === "fixture-success",
    collect: async () => ({ items: [], warnings: [] }),
  };
  const outcomes = await collectSources(
    [config("fixture-failing"), config("fixture-success")],
    { lookbackDays: 7, signal: new AbortController().signal },
    [failing, succeeding],
  );
  assert.equal(outcomes.length, 2);
  assert.equal(outcomes.find((outcome) => outcome.adapterKey === "fixture-failing")?.failed, true);
  assert.equal(outcomes.find((outcome) => outcome.adapterKey === "fixture-success")?.failed, false);
});
