import { createHash } from "node:crypto";
import type { AdapterResult, NormalizedEvidence, SourceConfig } from "../domain/contracts";
import { NormalizedEvidenceSchema } from "../domain/contracts";

export const ADAPTER_VERSION = "1.0.0";
export const DEFAULT_TIMEOUT_MS = 8_000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const MAX_PAGES = 5;
export const MAX_ITEMS = 100;
export const MAX_TEXT_LENGTH = 20_000;
export const MAX_EVIDENCE_EXCERPT_LENGTH = 5_000;

export interface CollectInput {
  config: SourceConfig;
  lookbackDays: number;
  signal: AbortSignal;
  now?: Date;
  timeoutMs?: number;
  browser?: BrowserFetcher;
}

export interface BrowserPage {
  html: string;
  finalUrl?: string;
  title?: string;
  replayRef?: string;
}

export interface BrowserFetcher {
  fetchPage(url: string, input: { signal: AbortSignal; timeoutMs: number }): Promise<BrowserPage>;
}

export interface SourceAdapter {
  readonly key: string;
  supports(config: SourceConfig): boolean;
  collect(input: CollectInput): Promise<AdapterResult>;
}

export class SourceHttpError extends Error {
  readonly status?: number;
  readonly sourceKey: string;
  readonly retryable: boolean;

  constructor(sourceKey: string, message: string, status?: number) {
    super(message);
    this.name = "SourceHttpError";
    this.sourceKey = sourceKey;
    this.status = status;
    this.retryable = status === undefined || status === 408 || status === 429 || status >= 500;
  }
}

export function boundedInteger(value: unknown, fallback: number, maximum: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(parsed)));
}

export function lookbackCutoff(lookbackDays: number, now = new Date()): Date {
  const days = Math.max(1, Math.min(90, Math.floor(lookbackDays || 30)));
  return new Date(now.getTime() - days * 86_400_000);
}

export function isAfterCutoff(value: unknown, cutoff: Date): boolean {
  const time = Date.parse(String(value ?? ""));
  return Number.isFinite(time) && time >= cutoff.getTime();
}

export function cleanText(value: unknown, maximum = MAX_TEXT_LENGTH): string {
  const text = String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maximum);
}

export function canonicalizeUrl(value: unknown, baseUrl?: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "https://invalid.local/";
  try {
    const url = new URL(raw, baseUrl);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || ["fbclid", "gclid", "ref", "ref_src", "source"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return raw.replace(/#.*$/, "").replace(/\/+$/, "");
  }
}

export function stableContentHash(title: unknown, excerpt: unknown, context = ""): string {
  const normalize = (value: unknown) => cleanText(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return createHash("sha256").update([title, excerpt, context].map(normalize).join("\n")).digest("hex");
}

export function normalizedEngagement(values: {
  score?: number;
  comments?: number;
  reactions?: number;
  views?: number;
}): NonNullable<NormalizedEvidence["engagement"]> {
  const safeScore = typeof values.score === "number" && Number.isFinite(values.score) && values.score >= 0 ? values.score : undefined;
  const safeComments = typeof values.comments === "number" && Number.isFinite(values.comments) && values.comments >= 0 ? Math.floor(values.comments) : undefined;
  const safeReactions = typeof values.reactions === "number" && Number.isFinite(values.reactions) && values.reactions >= 0 ? Math.floor(values.reactions) : undefined;
  const safeViews = typeof values.views === "number" && Number.isFinite(values.views) && values.views >= 0 ? Math.floor(values.views) : undefined;
  const total = [safeScore, safeComments, safeReactions, safeViews]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
  return {
    ...(safeScore === undefined ? {} : { score: safeScore }),
    ...(safeComments === undefined ? {} : { comments: safeComments }),
    ...(safeReactions === undefined ? {} : { reactions: safeReactions }),
    ...(safeViews === undefined ? {} : { views: safeViews }),
    normalized: Math.min(1, Math.log1p(total) / Math.log1p(100)),
  };
}

function boundedPayload(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  try {
    const parsed = JSON.parse(JSON.stringify(value, (key, nested) => {
      if (/token|secret|cookie|session|authorization|password|api[-_]?key/i.test(key)) return undefined;
      return nested;
    }));
    const serialized = JSON.stringify(parsed);
    if (serialized.length > 10_000) return { truncated: true };
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export interface EvidenceDraft {
  sourceKind: NormalizedEvidence["sourceKind"];
  sourceInstanceId: string;
  externalId: string;
  url: string;
  title: string;
  excerpt: string;
  context?: string;
  authorRef?: string;
  publishedAt?: string;
  language?: string;
  engagement?: NonNullable<NormalizedEvidence["engagement"]>;
  requestUrl: string;
  finalUrl?: string;
  solariRunRef?: string;
  replayRef?: string;
  transport: NormalizedEvidence["provenance"]["transport"];
  rawPayload?: unknown;
  collectedAt?: string;
}

export function makeEvidence(draft: EvidenceDraft, now = new Date()): NormalizedEvidence {
  const collectedAt = draft.collectedAt ?? now.toISOString();
  const title = cleanText(draft.title, 1_000);
  // Keep the normalized wire value within the database evidence constraint.
  // Long issue bodies remain available in rawPayload/context where supported.
  const excerpt = cleanText(draft.excerpt, MAX_EVIDENCE_EXCERPT_LENGTH);
  const context = draft.context ? cleanText(draft.context, MAX_TEXT_LENGTH) : undefined;
  const canonicalUrl = canonicalizeUrl(draft.url, draft.finalUrl ?? draft.requestUrl);
  return NormalizedEvidenceSchema.parse({
    sourceKind: draft.sourceKind,
    sourceInstanceId: draft.sourceInstanceId,
    externalId: draft.externalId || stableContentHash(title, excerpt),
    canonicalUrl,
    title: title || "Untitled public signal",
    excerpt: excerpt || title || "No excerpt available",
    context,
    authorRef: draft.authorRef ? cleanText(draft.authorRef, 500) : undefined,
    publishedAt: draft.publishedAt,
    collectedAt,
    language: draft.language,
    engagement: draft.engagement ?? normalizedEngagement({}),
    provenance: {
      transport: draft.transport,
      adapterVersion: ADAPTER_VERSION,
      requestUrl: canonicalizeUrl(draft.requestUrl),
      finalUrl: draft.finalUrl ? canonicalizeUrl(draft.finalUrl) : undefined,
      retrievedAt: collectedAt,
      solariRunRef: draft.solariRunRef,
      replayRef: draft.replayRef,
    },
    contentHash: stableContentHash(title, excerpt, context),
    rawPayload: boundedPayload(draft.rawPayload),
  });
}

export async function requestJson<T>(url: string, input: CollectInput, sourceKey: string): Promise<T> {
  const timeout = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const abort = () => controller.abort(input.signal.reason);
  input.signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new SourceHttpError(sourceKey, `HTTP ${response.status} from ${sourceKey}`, response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SourceHttpError) throw error;
    throw new SourceHttpError(sourceKey, error instanceof Error ? error.message : "Request failed");
  } finally {
    clearTimeout(timer);
    input.signal.removeEventListener("abort", abort);
  }
}

export async function requestText(url: string, input: CollectInput, sourceKey: string): Promise<string> {
  const timeout = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const abort = () => controller.abort(input.signal.reason);
  input.signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers: { accept: "text/html,application/xhtml+xml,application/xml" }, signal: controller.signal });
    if (!response.ok) throw new SourceHttpError(sourceKey, `HTTP ${response.status} from ${sourceKey}`, response.status);
    return await response.text();
  } catch (error) {
    if (error instanceof SourceHttpError) throw error;
    throw new SourceHttpError(sourceKey, error instanceof Error ? error.message : "Request failed");
  } finally {
    clearTimeout(timer);
    input.signal.removeEventListener("abort", abort);
  }
}

export function successful(items: NormalizedEvidence[], warnings: string[] = []): AdapterResult {
  return { items: items.slice(0, MAX_ITEMS), warnings };
}

export async function isolatedCollect(adapter: SourceAdapter, input: CollectInput): Promise<AdapterResult> {
  try {
    return await adapter.collect(input);
  } catch (error) {
    // The scan coordinator records this warning and continues with other adapters.
    const message = error instanceof Error ? error.message : "Unknown source failure";
    return { items: [], warnings: [`${adapter.key}: ${message}`] };
  }
}
