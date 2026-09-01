# Demand Radar

Demand Radar turns scattered public product requests into an evidence-backed view of what users need, what the product already covers, what is planned privately, and which opportunities remain unmapped.

**Live product:** [demandradar.pivnev.design](https://demandradar.pivnev.design)<br>
**Author:** [Anton Pivnev](https://pivnev.design) · [@Weeki513](https://github.com/Weeki513)

This repository is a public fork of [`solari-sdk/solari-cookbook`](https://github.com/solari-sdk/solari-cookbook). The original runnable Solari examples remain under [`examples/`](examples/); the production application lives alongside them.

## The job to be done

Product teams read the same demand repeatedly across issues, forums, launch comments, feeds, and support-adjacent communities. The hard part is not collecting more text. It is connecting the evidence to product context without exposing private roadmap information.

Demand Radar classifies each cluster with explicit precedence:

1. **Existing** — matches a public capability.
2. **Roadmap** — otherwise matches the private roadmap.
3. **Unmapped Opportunity** — matches neither.

Every conclusion remains inspectable down to its original evidence, source, timestamp, and retrieval provenance.

## Product

- A writable shared demo with 30 days of realistic history.
- Configurable recurring scans and a manual **Run now** path using the same queue.
- Evidence collection from developer communities, issue trackers, feeds, forums, and configurable source instances.
- Deterministic normalization, deduplication, clustering, trends, and scoring.
- A Pulse view that answers “what changed since I last reviewed this?”
- Product Context editing with accept/reject AI previews.
- Editable social drafts with autosave and reversible AI rewrites.
- Strict server-side treatment of private roadmap text and generated-copy redaction.

## Architecture

```text
Public sources ── adapters / Solari Browser
                         │
                         ▼
                Supabase scan queue
                         │
          Vercel worker leases one stage
                         │
                         ▼
              Solari Sandbox processor
       normalize → dedupe → cluster → score
                         │
                         ▼
              Postgres + row-level security
                         │
             Next.js product interface
                         │
                         ▼
              OpenAI structured outputs
```

The application is a Next.js and TypeScript monolith deployed on Vercel. Supabase provides email/password authentication, Postgres, row-level security, and the recurring scheduler. OpenAI Responses API calls use `gpt-5.6-luna` server-side for bounded structured tasks.

### Why Solari is a real system boundary

Solari Browser handles sources whose useful public content is assembled dynamically and also powers product-URL analysis. Sessions and clients are closed in `finally`; sensitive cookies and signed connection URLs are never persisted.

Solari Sandbox runs the pinned, pure-Python intelligence processor against bounded JSON. It keeps clustering reproducible and isolated from the web application runtime. Every sandbox is terminated with `kill()` and created with an idempotency key.

## Source strategy

Stable API adapters cover Hacker News Algolia, GitHub Issues, Stack Exchange, DEV/Forem, Lobsters, RSS/Atom, and public GitLab. Configurable adapters support GitHub Discussions, Discourse, Canny, and Product Hunt instances. A failed source is recorded independently and does not invalidate successful evidence from the rest of the scan.

Authenticated scraping of X, LinkedIn, and Reddit is intentionally not required for v1.

## Retention and business model

The retention loop is operational: recurring scans create new evidence, Pulse compresses the changes, users turn high-confidence opportunities into product actions and posts, and their review checkpoint makes the next visit meaningfully different.

MAU and pricing claims are scenario assumptions rather than observed results. A plausible paid model is workspace-based pricing with scan volume, history, source breadth, and additional collaborators as expansion dimensions.

## Local setup

Requirements: Node.js 22+, npm 10+, a Supabase project, Solari, and OpenAI API credentials.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Environment names are documented in [`.env.example`](.env.example). Keep all secret keys server-only; never expose the Supabase secret key, Solari key, OpenAI key, demo password, or worker secret through a `NEXT_PUBLIC_` variable.

Database migrations and demo seed data live in [`supabase/`](supabase/). The preserved standalone Solari cookbook programs remain available in [`examples/`](examples/).

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The release gate also includes Supabase RLS and integration checks, Playwright product-flow tests, one paid Solari Browser smoke, one paid Solari Sandbox smoke, and a fresh HTTPS request to the canonical domain.

## License

MIT. See [`LICENSE`](LICENSE).
