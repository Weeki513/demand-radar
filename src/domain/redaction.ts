import type { ContextItem, NormalizedEvidence } from "./contracts";

export class PrivateContextLeakError extends Error {
  readonly matches: string[];

  constructor(matches: string[]) {
    super("Generated public content contains private product context");
    this.name = "PrivateContextLeakError";
    this.matches = matches;
  }
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function candidateSecrets(items: readonly ContextItem[]): string[] {
  return [...new Set(items.flatMap((item) => [item.id, item.text]))]
    .map((value) => value.trim())
    .filter((value) => value.length >= 3)
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
}

/** Return only public context; this is the only context allowed in a public-post prompt. */
export function publicContextOnly(items: readonly ContextItem[]): ContextItem[] {
  return items.filter((item) => item.visibility === "public" && item.kind !== "roadmap");
}

export interface PublicPostInput {
  clusterTitle: string;
  evidence: Array<Pick<NormalizedEvidence, "title" | "excerpt" | "canonicalUrl">>;
  publicContext: ContextItem[];
}

export function buildPublicPostInput(
  clusterTitle: string,
  evidence: Array<Pick<NormalizedEvidence, "title" | "excerpt" | "canonicalUrl">>,
  contextItems: readonly ContextItem[],
): PublicPostInput {
  return { clusterTitle, evidence, publicContext: publicContextOnly(contextItems) };
}

export interface RedactionResult {
  text: string;
  redacted: boolean;
  matches: string[];
}

/** Replace private IDs/phrases before a public post is persisted or displayed. */
export function redactPrivateContext(text: string, privateItems: readonly ContextItem[]): RedactionResult {
  let safeText = text;
  const matches: string[] = [];
  for (const secret of candidateSecrets(privateItems)) {
    const expression = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped(secret)}(?![\\p{L}\\p{N}_])`, "giu");
    if (!expression.test(safeText)) continue;
    matches.push(secret);
    safeText = safeText.replace(expression, "[redacted]");
  }
  return { text: safeText, redacted: matches.length > 0, matches };
}

export function assertNoPrivateContextLeak(text: string, privateItems: readonly ContextItem[]): void {
  const result = redactPrivateContext(text, privateItems);
  if (result.redacted) throw new PrivateContextLeakError(result.matches);
}
