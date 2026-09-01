# Demand Radar — Product Specification

## 1. Product

Demand Radar is a recurring market-intelligence product for founders and indie hackers who continuously build and launch small software products.

The product connects:

**What you publicly ship + what you're privately building + what the market is asking for → what should you do today?**

This is also a submission for the Pinetree Research / Solari SWE challenge. The repository and deployed product must demonstrate a real, recurring use case for Solari rather than a one-off technical demo.

---

## 2. Core JTBD

> When I am building one or several products, I want to continuously know what my potential users are asking for across the public web, so I can decide what to build, prioritize, discuss, or publish without manually monitoring dozens of communities.

The product must distinguish between:

- Public product capabilities
- Private roadmap capabilities
- New demand not represented anywhere in the roadmap

Example:

- Public: A, B
- Private roadmap: C, D
- Market demand: J

Demand Radar should explicitly surface **J as a new product opportunity**.

---

## 3. Core Loop

1. Understand the product.
2. Understand the private roadmap.
3. Scan public sources on schedule.
4. Extract individual demand signals.
5. Deduplicate and cluster related signals.
6. Score clusters.
7. Compare them against product capabilities and roadmap.
8. Track changes over time.
9. Recommend an action.
10. Generate editable social content when relevant.

The value of the product must compound over time through historical demand data.

---

# 4. Product Context

Each product has its own workspace.

### Input

User provides:

- Public product URL
- Manually entered existing features
- Private / upcoming features
- Additional product context

The product URL is analyzed automatically.

### Product Model

The UI displays a decomposed product model containing:

- Positioning
- ICP
- Problems solved
- Capabilities
- Existing features
- Differentiators / USP
- Private roadmap
- Relevant keywords / concepts

Automatically generated information and manually entered information live in the same model.

### Editing

Every item must support:

- Edit
- Magic Wand
- Delete

All AI-generated information is manually editable.

### Magic Wand

The user can enter unstructured thoughts such as:

> we're working on making browser sessions survive authentication failures and automatically recover

The AI converts this into structured product context suitable for downstream matching.

---

# 5. Demand Signals

The primary analytics screen.

One row represents **one demand cluster**, not one URL.

Example:

> Persistent authenticated browser sessions  
> Score: 87  
> 14 independent signals · 5 sources

Multiple discussions expressing substantially the same need must be clustered together.

### Cluster fields

Each cluster contains:

- Demand title
- Score
- Score explanation
- Number of independent signals
- Number of independent sources
- First detected
- Last detected
- Trend
- Related public capability
- Related private roadmap capability
- Opportunity status
- Suggested action
- Generated post

### Evidence

Clusters expand into individual evidence items containing:

- Platform
- Source URL
- Date
- Relevant excerpt / context
- Engagement metadata where available
- Matching rationale

The system must preserve source provenance.

---

# 6. Opportunity Classification

Every demand cluster must be classified against the product model.

Possible states:

### Existing

The market is requesting functionality already publicly available.

Potential action:

> Join the conversation / explain the existing solution.

### Roadmap

The market is requesting functionality currently present in the private roadmap.

Potential action:

> Evidence that this roadmap item may deserve higher priority.

Private roadmap information must **never automatically leak into generated public content**.

### Unmapped Opportunity

The market repeatedly requests something absent from both the public product and private roadmap.

Potential action:

> New product opportunity worth investigating.

This should be visually prominent.

---

# 7. Posts

Demand clusters can generate social posts.

Generated posts must never be static text blocks.

They open directly inside a rich-text editor.

### Editor

Required:

- Inline editing
- Undo / redo
- Links
- Lists
- Basic formatting
- Autosave
- Character counter
- Platform-specific constraints

### AI editing

Magic Wand supports:

- Shorter
- Longer
- Stronger
- Less promotional
- Change tone
- Custom instruction

Custom instruction example:

> Make this more technical and remove the marketing language.

The user can accept or reject the rewrite.

### Image Generation

Include:

`Generate image`

The feature is disabled in the challenge demo.

Hover tooltip:

> Coming soon

No image-generation implementation is required.

---

# 8. Social Profiles

Per-product settings define where the founder publishes.

Initial platforms:

- X / Twitter
- LinkedIn
- Reddit

Architecture should allow additional platforms later.

Each platform stores:

- Enabled / disabled
- Account type where relevant
- Content constraints
- Preferred length
- Tone of Voice
- Additional writing instructions

Generated posts must respect the selected platform configuration.

Tone of Voice is configured independently for every platform.

---

# 9. Pulse Dashboard

A separate dashboard exists primarily to create a recurring usage loop.

It should answer:

> What changed since I last checked?

Required information:

- New demand today
- Rising demand
- Falling demand
- Newly discovered opportunities
- High-confidence signals
- Roadmap demand
- Unmapped opportunities
- Scan activity
- Actions/posts created from signals

Historical demand should become increasingly valuable over time.

Where sufficient history exists, show demand trends for individual capabilities.

---

# 10. Multi-product

A user can maintain multiple products.

Sidebar includes:

- Product switcher
- Add product

Each product has independent:

- Product context
- Private roadmap
- Sources
- Scan configuration
- Demand clusters
- Demand history
- Posts
- Social settings

The target user is explicitly allowed to be someone repeatedly launching small SaaS products, experiments and side projects rather than only a founder operating one mature startup.

---

# 11. Scanning

Scanning is a real product feature, not a simulated demo.

Each product has configurable:

- Enabled / disabled
- Frequency
- Execution time
- Timezone
- Lookback period
- Sources

There must also be:

`Run now`

Manual and scheduled scans must execute **the same pipeline**.

### Scan lifecycle

`queued → collecting → processing → clustering → scoring → generating → completed`

Failures should be recorded.

Failure of one source must not fail the complete scan.

### Scan History

Store:

- Start time
- End time
- Duration
- Status
- Sources attempted
- Sources succeeded
- Raw signals discovered
- Clusters produced
- Errors

---

# 12. Sources

The initial source pool must be substantial enough to produce useful cross-source demand intelligence.

Priority sources that can provide meaningful public information without requiring user login:

- Hacker News
- GitHub Issues
- GitHub Discussions
- Stack Overflow
- Stack Exchange communities
- DEV / Forem communities
- Lobsters
- Public Discourse forums
- Public GitLab projects/issues
- Product Hunt public pages
- Public Canny boards
- RSS / Atom feeds
- Other compatible public community/forum sources

Public Discourse, Canny, RSS and similar adapters should support multiple configured communities rather than being treated as one website.

Sources that prove unreliable without authentication must not be required for the core pipeline.

X, LinkedIn and Reddit scraping should not become dependencies of the initial reliable scan pipeline if anonymous access is unstable.

---

# 13. Source Architecture

Do not scrape everything through a browser merely to demonstrate Solari.

Each adapter may use the most appropriate transport:

- Public API
- RSS / Atom
- Solari Browser
- Public HTML

Solari Browser should be used where real browser execution materially improves reliability or access to rendered public information.

Each source produces a common normalized evidence format.

---

# 14. Solari

Solari is a required and meaningful part of the architecture.

### Solari Browser

Used for:

- Public-web research
- Dynamic pages
- Browser-dependent sources
- Evidence collection
- Session recording / provenance where useful

### Solari Sandbox

Used for processing collected evidence:

- Normalization
- Deduplication
- Clustering
- Scoring
- Trend calculations
- Reproducible processing of untrusted web content

Do not add Solari Desktop merely to increase the number of Solari products used.

Solari usage should follow naturally from the product architecture.

---

# 15. Technical Stack

Optimize for fast implementation while keeping the core product real.

### Application

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Storage / Backend

Prefer inexpensive/free, vibe-coder-friendly infrastructure.

Default:

- Supabase Postgres
- Supabase Auth
- Supabase scheduled jobs / cron where appropriate

### Deployment

- Vercel or similarly simple deployment

Avoid unnecessary infrastructure.

No:

- Microservices
- Kafka
- Complex queue infrastructure unless demonstrably required
- Enterprise permission systems
- Billing
- Teams
- Organization management

---

# 16. Authentication

Authentication exists only to make the deployed application usable.

Required:

- Login
- Password

Not required:

- Email verification
- 2FA
- OAuth
- Magic links
- Complex recovery flows

Passwords must still be handled through a proper authentication implementation rather than stored as plaintext.

Successful credentials immediately open the application.

---

# 17. UI System

## Principle

> Do not fill empty space just because it exists.

Whitespace is an intentional component of the interface.

Prefer removing a container, label, icon, color or decoration unless it materially improves comprehension.

### Visual direction

- White background
- Black / near-black primary text
- Neutral gray secondary text
- Small typography
- Thin borders
- Large amounts of whitespace
- Restrained radius
- No decorative shadows
- Almost no decorative color
- Dense information only where density is useful
- Generous spacing everywhere else

Use color primarily for functional meaning:

- Status
- Warning
- Score
- Rising / falling
- Opportunity state

### Components

Use shadcn/ui.

Do not invent custom UI patterns when an appropriate shadcn primitive already exists.

Do not blindly reproduce the default shadcn visual style.

Avoid turning every piece of information into a Card.

Prefer:

- Typography
- Tables
- Dividers
- Whitespace
- Popovers
- Tooltips
- Dropdowns
- Sheets
- Dialogs

over unnecessary containers.

The product should feel closer to **editorial/research software** than a generic AI SaaS dashboard.

---

# 18. Navigation

Desktop-first vertical navigation.

Primary destinations:

- Product Context
- Demand Signals
- Pulse
- Posts
- Scan History
- Settings

Include a product switcher within or adjacent to navigation.

Navigation should remain visually minimal.

---

# 19. Landing Page

A public landing page is required.

Maximum approximately 3–4 viewport-sized sections.

No generated graphics.

No custom illustrations.

No diagrams required.

No gradients, glow effects, 3D elements or decorative AI imagery.

### Section 1 — Hero

Minimal headline communicating the core proposition.

Example direction:

> Know what your market wants before you build it.

Supporting copy.

Primary CTA:

`Try demo`

Secondary:

`GitHub`

### Section 2 — How it works

Three simple steps:

> Describe what you build  
> We continuously scan public demand  
> See what the market wants next

Mostly typography and whitespace.

### Section 3 — Product

Use the actual product interface as the visual proof.

Explain:

- Demand discovery
- Private roadmap matching
- Unmapped opportunities
- Historical demand

Do not create separate marketing artwork.

### Section 4 — CTA / Footer

Minimal final CTA.

Include relevant links to:

- Demo
- GitHub
- Solari

---

# 20. Retention

Retention is part of the product thesis, not an afterthought.

Day 1:

> Find useful conversations and demand.

Day 30:

> Understand which requests are recurring or accelerating.

Day 90:

> Maintain a personalized historical market-pull dataset around the products and roadmap.

The accumulated history should make abandoning the product increasingly costly.

---

# 21. Metrics

Primary product metric:

> Qualified demand signals acted on / active workspace / week

Useful secondary metrics:

- Scan retention
- W4 workspace retention
- Sources opened
- Signals saved
- Signals dismissed
- Posts created
- Posts edited
- Roadmap opportunities discovered
- Actions taken from signals

The challenge presentation may include a retention/MAU scenario model.

Any future MAU numbers must be explicitly presented as assumptions/scenarios rather than measured traction.

---

# 22. Challenge / Application Requirement

This repository is simultaneously:

1. A functioning product
2. A Solari implementation
3. An application to Pinetree Research

The submission must demonstrate:

- Product thinking
- Engineering ability
- Appropriate use of Solari
- Real public-web research
- Recurring infrastructure usage
- Reliability
- UX quality
- Retention thinking
- Commercial / market thinking

The GitHub repository must be public and runnable.

README should explain:

- Problem
- JTBD
- Product
- Why Solari
- Architecture
- Source strategy
- Recurring scan loop
- Retention thesis
- Potential business model / MAU scenarios
- Setup
- Live demo

The deployed application should be usable during review rather than existing only as screenshots.

---

# 23. Scope Principle

This is not a disposable prototype.

It should be **production-shaped but deliberately narrow**.

Features included in the submission should work properly.

Features outside the core thesis should be omitted rather than implemented poorly.

Prioritize:

**real data → real recurring scans → useful clustering → explainable demand → excellent editing → polished UI**

over adding more surface area.

# 24. Solari Challenge Bootstrap

This project MUST be built as a fork of the official Solari Cookbook repository.

Upstream repository:
https://github.com/solari-sdk/solari-cookbook

Do not create the submission as an unrelated standalone repository.

## Solari API

The application must use the real Solari API.

Create a Solari account through:
https://console.getsolari.com

Redeem the challenge promo code:

STARTER1MO-MKY4BNDK

The promo provides one month of free Solari credits.

Store the API key server-side:

SOLARI_API_KEY=...

Never expose the Solari API key to the browser or commit it to Git.

The deployed application must execute real Solari Browser and Solari Sandbox workloads rather than mocked equivalents.

## Submission Requirements

The final project must:

1. Remain a public fork of `solari-sdk/solari-cookbook`.
2. Contain the complete Demand Radar implementation.
3. Use the real Solari API.
4. Be publicly deployed and usable.
5. Include setup and architecture documentation in README.
6. Include a link to the live product.
7. Be published on X or LinkedIn as the challenge submission.
8. Tag Harry Chow and Solari in the submission post.