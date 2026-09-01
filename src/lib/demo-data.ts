export type Trend = "rising" | "steady" | "falling"
export type OpportunityStatus = "Existing" | "Roadmap" | "Unmapped opportunity"

export type Evidence = {
  id: string
  platform: string
  sourceUrl: string
  date: string
  excerpt: string
  engagement: string
  rationale: string
}

export type DemandCluster = {
  id: string
  title: string
  score: number
  scoreExplanation: string
  signalCount: number
  sourceCount: number
  firstDetected: string
  lastDetected: string
  trend: Trend
  publicCapability: string | null
  roadmapCapability: string | null
  status: OpportunityStatus
  action: string
  generatedPost: string
  evidence: Evidence[]
}

export type DemoProduct = {
  id: string
  name: string
  description: string
  url: string
  initials: string
  positioning: string
  icp: string
  problems: string[]
  capabilities: string[]
  roadmap: string[]
  keywords: string[]
}

export const demoProducts: DemoProduct[] = [
  {
    id: "atlas",
    name: "Atlas Browser",
    description: "Reliable browser automation for small teams.",
    url: "atlasbrowser.dev",
    initials: "AB",
    positioning: "Browser automation that survives the messy parts of real workflows.",
    icp: "Indie hackers and lean product teams shipping browser-based operations.",
    problems: ["Fragile authenticated sessions", "Hard-to-debug automation failures", "Manual recovery work"],
    capabilities: ["Session recovery", "Workflow replay", "Failure traces", "Scheduled runs"],
    roadmap: ["Environment snapshots", "Cross-region runners", "Team runbooks"],
    keywords: ["browser automation", "sessions", "recovery", "playwright", "workflow reliability"],
  },
  {
    id: "relay",
    name: "Relay Notes",
    description: "A calm inbox for customer research.",
    url: "relaynotes.co",
    initials: "RN",
    positioning: "Turn scattered customer conversations into decisions your team can act on.",
    icp: "Founders who need a lightweight research system before they need a research team.",
    problems: ["Research spread across tools", "Insights that disappear after a call", "No consistent follow-up"],
    capabilities: ["Conversation capture", "Theme clustering", "Decision briefs", "Weekly digests"],
    roadmap: ["Research repository", "Shared interview guides", "Opportunity scoring"],
    keywords: ["customer research", "product feedback", "qualitative data", "founders"],
  },
]

export const demoClusters: DemandCluster[] = [
  {
    id: "authenticated-sessions",
    title: "Persistent authenticated browser sessions",
    score: 87,
    scoreExplanation: "High recurrence across independent developers, with accelerating discussion volume.",
    signalCount: 14,
    sourceCount: 5,
    firstDetected: "Aug 12, 2026",
    lastDetected: "Today",
    trend: "rising",
    publicCapability: "Session recovery",
    roadmapCapability: null,
    status: "Existing",
    action: "Join the conversation and explain the existing recovery workflow.",
    generatedPost: "Authentication failures should not turn a reliable workflow into a manual rescue mission. We built session recovery for exactly that gap.",
    evidence: [
      {
        id: "session-hn",
        platform: "Hacker News",
        sourceUrl: "https://news.ycombinator.com/item?id=41240001",
        date: "Aug 29, 2026",
        excerpt: "The painful part is not starting a browser. It is keeping an authenticated session alive long enough to finish the job.",
        engagement: "86 points · 41 comments",
        rationale: "Direct request for durable authenticated state in a browser workflow.",
      },
      {
        id: "session-github",
        platform: "GitHub Issues",
        sourceUrl: "https://github.com/microsoft/playwright/issues/41222",
        date: "Aug 27, 2026",
        excerpt: "Is there a recommended way to recover storage state after a provider invalidates the session?",
        engagement: "19 reactions",
        rationale: "Independent issue describing the same recovery need with concrete implementation context.",
      },
    ],
  },
  {
    id: "environment-snapshots",
    title: "Reproducible local development environments",
    score: 78,
    scoreExplanation: "Consistent demand from teams moving automation from a laptop to a scheduled runner.",
    signalCount: 9,
    sourceCount: 4,
    firstDetected: "Aug 06, 2026",
    lastDetected: "Yesterday",
    trend: "steady",
    publicCapability: null,
    roadmapCapability: "Environment snapshots",
    status: "Roadmap",
    action: "Use this recurrence as evidence when sequencing the environment snapshot work.",
    generatedPost: "The distance between “works on my machine” and a dependable automation run is still too large. Reproducible environments are becoming table stakes.",
    evidence: [
      {
        id: "env-stack",
        platform: "Stack Overflow",
        sourceUrl: "https://stackoverflow.com/questions/80123456/reproducible-browser-environment",
        date: "Aug 28, 2026",
        excerpt: "How do you pin a browser + dependencies setup so a scheduled job behaves like local development?",
        engagement: "7 answers · 12 votes",
        rationale: "Question centers on reproducibility across local and hosted execution.",
      },
      {
        id: "env-dev",
        platform: "DEV Community",
        sourceUrl: "https://dev.to/example/reliable-browser-automation",
        date: "Aug 24, 2026",
        excerpt: "We lost two days to a runner that had a subtly different browser image than the one used to build the workflow.",
        engagement: "23 reactions",
        rationale: "A separate practitioner reports the operational cost of missing environment parity.",
      },
    ],
  },
  {
    id: "explainable-failures",
    title: "Tests that explain why they failed",
    score: 74,
    scoreExplanation: "Growing cross-source demand with no matching public or planned capability.",
    signalCount: 11,
    sourceCount: 6,
    firstDetected: "Aug 19, 2026",
    lastDetected: "Today",
    trend: "rising",
    publicCapability: null,
    roadmapCapability: null,
    status: "Unmapped opportunity",
    action: "Investigate a failure-explanation workflow before adding more test surface area.",
    generatedPost: "A failed test is only useful when it shortens the path to the fix. The next generation of automation tools should explain the failure, not just report it.",
    evidence: [
      {
        id: "failure-lobsters",
        platform: "Lobsters",
        sourceUrl: "https://lobste.rs/s/example/when_tests_fail",
        date: "Aug 31, 2026",
        excerpt: "The report says red. I need the shortest possible explanation of what changed and where the evidence is.",
        engagement: "34 upvotes · 18 comments",
        rationale: "Clear unmet need around translating test output into an actionable explanation.",
      },
      {
        id: "failure-gitlab",
        platform: "GitLab Issues",
        sourceUrl: "https://gitlab.com/gitlab-org/gitlab/-/issues/498201",
        date: "Aug 30, 2026",
        excerpt: "Can the failure summary point to the first meaningful divergence instead of making us inspect the whole trace?",
        engagement: "11 thumbs up",
        rationale: "A separate source asks for the same root-cause-oriented failure summary.",
      },
    ],
  },
  {
    id: "data-export",
    title: "One-click data export",
    score: 62,
    scoreExplanation: "Established need with stable volume and broad but low-intensity engagement.",
    signalCount: 7,
    sourceCount: 3,
    firstDetected: "Jul 28, 2026",
    lastDetected: "Aug 30, 2026",
    trend: "falling",
    publicCapability: "CSV export",
    roadmapCapability: null,
    status: "Existing",
    action: "Publish a short guide showing how to move data out of Atlas.",
    generatedPost: "Your automation data should stay portable. Atlas exports clean CSVs whenever you need to take the work somewhere else.",
    evidence: [
      {
        id: "export-canny",
        platform: "Canny",
        sourceUrl: "https://atlasbrowser.canny.io/feature-requests/p/export-data",
        date: "Aug 30, 2026",
        excerpt: "Would love a simple way to download the run history and inspect it outside the dashboard.",
        engagement: "8 votes",
        rationale: "Request maps directly to an existing export capability.",
      },
    ],
  },
  {
    id: "visible-retries",
    title: "Background jobs with visible retries",
    score: 58,
    scoreExplanation: "Early signal with positive movement, but not enough history for a high-confidence bet.",
    signalCount: 6,
    sourceCount: 4,
    firstDetected: "Aug 25, 2026",
    lastDetected: "Aug 31, 2026",
    trend: "rising",
    publicCapability: null,
    roadmapCapability: null,
    status: "Unmapped opportunity",
    action: "Collect another week of evidence before committing to discovery work.",
    generatedPost: "Retries are part of the product experience. People should be able to see what is waiting, what is running again, and why.",
    evidence: [
      {
        id: "retry-discourse",
        platform: "Discourse",
        sourceUrl: "https://community.example.com/t/visible-background-retries/1842",
        date: "Aug 31, 2026",
        excerpt: "We can retry jobs, but we cannot tell which ones are stuck in retry loops without opening the logs.",
        engagement: "15 likes",
        rationale: "Operational request for transparent retry state in background work.",
      },
    ],
  },
]

export const pulseStats = [
  { label: "New demand today", value: "18", note: "+6 vs. yesterday", tone: "up" },
  { label: "Rising clusters", value: "7", note: "3 high confidence", tone: "up" },
  { label: "New opportunities", value: "2", note: "Since your last check", tone: "neutral" },
  { label: "Signals acted on", value: "12", note: "This week", tone: "neutral" },
] as const

export const scanRuns = [
  { id: "scan-0829", date: "Today, 09:14", duration: "04m 22s", status: "Completed", attempted: 12, succeeded: 11, raw: 184, clusters: 18 },
  { id: "scan-0828", date: "Yesterday, 09:12", duration: "04m 08s", status: "Completed", attempted: 12, succeeded: 12, raw: 161, clusters: 16 },
  { id: "scan-0827", date: "Aug 27, 09:16", duration: "03m 51s", status: "Completed", attempted: 12, succeeded: 10, raw: 143, clusters: 14 },
  { id: "scan-0826", date: "Aug 26, 09:10", duration: "01m 32s", status: "Partial", attempted: 12, succeeded: 8, raw: 95, clusters: 9 },
]

export const socialProfiles = [
  { name: "X / Twitter", handle: "@atlasbrowser", enabled: true, length: "280 characters", tone: "Direct, technical" },
  { name: "LinkedIn", handle: "Atlas Browser", enabled: true, length: "900 characters", tone: "Clear, reflective" },
  { name: "Reddit", handle: "u/atlas-builder", enabled: false, length: "No hard limit", tone: "Helpful, conversational" },
]

export function getProduct(productId: string) {
  return demoProducts.find((product) => product.id === productId) ?? demoProducts[0]
}

export function getCluster(clusterId: string) {
  return demoClusters.find((cluster) => cluster.id === clusterId)
}
