export const DEFAULT_SOURCE_CONFIGS = [
  { adapter_key: "hacker_news", display_name: "Hacker News", config: { query: "product feedback" } },
  { adapter_key: "github_issues", display_name: "GitHub Issues", config: { repositories: ["microsoft/playwright", "browser-use/browser-use"] } },
  { adapter_key: "stack_exchange", display_name: "Stack Exchange", config: { site: "stackoverflow" } },
  { adapter_key: "rss_atom", display_name: "Developer RSS feeds", config: { feedUrl: "https://dev.to/feed" } },
  { adapter_key: "discourse_browser", display_name: "Public Discourse communities", config: { url: "https://meta.discourse.org/latest" } },
] as const
