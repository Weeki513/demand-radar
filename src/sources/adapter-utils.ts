import type { SourceConfig } from "../domain/contracts";
import { boundedInteger, MAX_ITEMS, MAX_PAGE_SIZE } from "./contracts";

export function configValue<T>(config: SourceConfig, key: string, fallback: T): T {
  const value = config.config[key];
  return (value === undefined || value === null ? fallback : value) as T;
}

export function configStrings(config: SourceConfig, key: string): string[] {
  const value = config.config[key];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export function sourceInstance(config: SourceConfig): string {
  return config.id || `${config.adapterKey}:${config.displayName}`;
}

export function pageSize(config: SourceConfig, fallback = 20): number {
  return boundedInteger(configValue(config, "pageSize", fallback), fallback, MAX_PAGE_SIZE);
}

export function maxPages(config: SourceConfig): number {
  return boundedInteger(configValue(config, "maxPages", 5), 5, 5);
}

export function maxItems(config: SourceConfig): number {
  return boundedInteger(configValue(config, "maxItems", MAX_ITEMS), MAX_ITEMS, MAX_ITEMS);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const result = String(value).trim();
  return result || undefined;
}

export function optionalNumber(value: unknown): number | undefined {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : undefined;
}
