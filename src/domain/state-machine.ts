import type { ScanSourceState, ScanState } from "./contracts";

export const ALLOWED_SCAN_TRANSITIONS: Readonly<Record<ScanState, readonly ScanState[]>> = {
  queued: ["collecting"],
  collecting: ["processing", "failed"],
  processing: ["clustering", "failed"],
  clustering: ["scoring", "failed"],
  scoring: ["generating", "failed"],
  generating: ["completed", "failed"],
  completed: [],
  failed: [],
};

export class InvalidScanTransitionError extends Error {
  readonly from: ScanState;
  readonly to: ScanState;

  constructor(from: ScanState, to: ScanState) {
    super(`Invalid scan transition: ${from} -> ${to}`);
    this.name = "InvalidScanTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function canTransitionScan(from: ScanState, to: ScanState): boolean {
  return ALLOWED_SCAN_TRANSITIONS[from].includes(to);
}

export function transitionScan(from: ScanState, to: ScanState): ScanState {
  if (!canTransitionScan(from, to)) throw new InvalidScanTransitionError(from, to);
  return to;
}

export function isTerminalScanState(state: ScanState): boolean {
  return state === "completed" || state === "failed";
}

export const ALLOWED_SOURCE_TRANSITIONS: Readonly<Record<ScanSourceState, readonly ScanSourceState[]>> = {
  queued: ["collecting", "failed"],
  collecting: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function canTransitionSource(from: ScanSourceState, to: ScanSourceState): boolean {
  return ALLOWED_SOURCE_TRANSITIONS[from].includes(to);
}

export interface SourceAttemptSummary {
  status: ScanSourceState;
  sourceId: string;
  errorCode?: string;
  errorMessage?: string;
}

/** A source failure is data on the attempt, not an automatic scan failure. */
export function summarizeCollection(attempts: readonly SourceAttemptSummary[]): {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: Array<{ sourceId: string; code: string; message: string }>;
  canProcess: boolean;
} {
  const errors = attempts
    .filter((attempt) => attempt.status === "failed")
    .map((attempt) => ({
      sourceId: attempt.sourceId,
      code: attempt.errorCode ?? "SOURCE_FAILED",
      message: attempt.errorMessage ?? "Source collection failed",
    }));
  return {
    attempted: attempts.length,
    succeeded: attempts.filter((attempt) => attempt.status === "completed").length,
    failed: errors.length,
    errors,
    canProcess: attempts.length > 0 && attempts.every((attempt) => ["completed", "failed"].includes(attempt.status)),
  };
}
