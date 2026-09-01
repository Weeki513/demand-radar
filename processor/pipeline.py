"""Deterministic processing for Demand Radar evidence.

This module intentionally uses only the Python standard library.  It is safe to
run locally or in a Solari Sandbox: input is treated as untrusted text, all
collection limits are enforced by the adapters, and every operation is
deterministic for a given input and clock value.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import unescape
import hashlib
import math
import re
from typing import Any, Iterable, Mapping, Sequence
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


PIPELINE_VERSION = "deterministic-v1"
CLUSTER_SIMILARITY_THRESHOLD = 0.72
OPPORTUNITY_SIMILARITY_THRESHOLD = 0.72
_TRACKING_QUERY_KEYS = {
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
    "source",
}
_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "that",
    "the",
    "this",
    "to",
    "we",
    "what",
    "when",
    "with",
    "you",
    "your",
}
_TAG_RE = re.compile(r"<[^>]*>")
_WORD_RE = re.compile(r"[\w]+", re.UNICODE)
_NON_WORD_RE = re.compile(r"[^\w\s]", re.UNICODE)


def _as_text(value: Any) -> str:
    return "" if value is None else str(value)


def normalize_text(value: Any) -> str:
    """Return a stable, case-insensitive representation of untrusted text."""

    import unicodedata

    text = unescape(_TAG_RE.sub(" ", _as_text(value)))
    text = unicodedata.normalize("NFKC", text).casefold()
    text = _NON_WORD_RE.sub(" ", text)
    return " ".join(text.split())


def display_text(value: Any) -> str:
    """Collapse markup/whitespace while retaining human-readable casing."""

    return " ".join(unescape(_TAG_RE.sub(" ", _as_text(value))).split())


def canonicalize_url(value: Any) -> str:
    """Canonicalize a public URL without making a network request.

    Tracking parameters and fragments are removed, host/scheme are lowercased,
    and query keys are sorted.  A malformed or relative URL is returned in a
    normalized form so the evidence item is not silently discarded.
    """

    raw = display_text(value)
    if not raw:
        return ""
    parsed = urlsplit(raw)
    if not parsed.scheme and parsed.netloc:
        parsed = urlsplit("https:" + raw)
    scheme = parsed.scheme.casefold()
    host = (parsed.hostname or "").casefold()
    if not host:
        return raw.rstrip("/")
    try:
        port = parsed.port
    except ValueError:
        port = None
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        host = f"{host}:{port}"
    if parsed.username or parsed.password:
        # Credentials must never become part of a provenance URL.
        host = host.rsplit("@", 1)[-1]
    pairs = [
        (key, val)
        for key, val in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.casefold().startswith("utm_") and key.casefold() not in _TRACKING_QUERY_KEYS
    ]
    pairs.sort()
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit((scheme or "https", host, path, urlencode(pairs), ""))


def content_hash(title: Any, excerpt: Any = "", context: Any = "") -> str:
    """Hash normalized semantic content, not source-specific presentation."""

    payload = "\n".join(normalize_text(part) for part in (title, excerpt, context)).strip()
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _pick(item: Mapping[str, Any], *names: str, default: Any = None) -> Any:
    for name in names:
        if name in item:
            return item[name]
    return default


@dataclass(frozen=True)
class NormalizedSignal:
    source_kind: str
    source_instance_id: str
    external_id: str
    canonical_url: str
    title: str
    excerpt: str
    context: str
    author_ref: str | None
    published_at: str | None
    collected_at: str
    language: str | None
    engagement: Mapping[str, float | int]
    provenance: Mapping[str, Any]
    content_hash: str
    raw_payload: Mapping[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        result = {
            "sourceKind": self.source_kind,
            "sourceInstanceId": self.source_instance_id,
            "externalId": self.external_id,
            "canonicalUrl": self.canonical_url,
            "title": self.title,
            "excerpt": self.excerpt,
            "context": self.context,
            "authorRef": self.author_ref,
            "publishedAt": self.published_at,
            "collectedAt": self.collected_at,
            "language": self.language,
            "engagement": dict(self.engagement),
            "provenance": dict(self.provenance),
            "contentHash": self.content_hash,
        }
        if self.raw_payload is not None:
            result["rawPayload"] = dict(self.raw_payload)
        return result


def normalize_signal(item: Mapping[str, Any], *, collected_at: str | None = None) -> dict[str, Any]:
    """Normalize one adapter result into the shared evidence contract."""

    now = collected_at or datetime.now(timezone.utc).isoformat()
    title = display_text(_pick(item, "title", default=""))
    excerpt = display_text(_pick(item, "excerpt", "text", "description", default=""))
    context = display_text(_pick(item, "context", default=""))
    provenance = dict(_pick(item, "provenance", default={}) or {})
    provenance.setdefault("retrievedAt", now)
    provenance.setdefault("adapterVersion", "unknown")
    provenance.setdefault("transport", "api")
    engagement = dict(_pick(item, "engagement", default={}) or {})
    engagement = {
        key: value
        for key, value in engagement.items()
        if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))
    }
    normalized = NormalizedSignal(
        source_kind=_as_text(_pick(item, "sourceKind", "source_kind", default="unknown")),
        source_instance_id=_as_text(_pick(item, "sourceInstanceId", "source_instance_id", default="default")),
        external_id=_as_text(_pick(item, "externalId", "external_id", default="")),
        canonical_url=canonicalize_url(_pick(item, "canonicalUrl", "canonical_url", "url", default="")),
        title=title,
        excerpt=excerpt,
        context=context,
        author_ref=_pick(item, "authorRef", "author_ref", "author", default=None),
        published_at=_pick(item, "publishedAt", "published_at", "date", default=None),
        collected_at=_as_text(_pick(item, "collectedAt", "collected_at", default=now)),
        language=_pick(item, "language", default=None),
        engagement=engagement,
        provenance=provenance,
        content_hash=content_hash(title, excerpt, context),
        raw_payload=_pick(item, "rawPayload", "raw_payload", default=None),
    )
    return normalized.as_dict()


def deduplicate_signals(signals: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Deduplicate adapter retries while retaining cross-source evidence.

    The source-instance namespace is part of URL/hash keys.  Thus two distinct
    platforms quoting the same need remain independent evidence items and can
    increase source diversity, while a retry from one adapter is collapsed.
    """

    seen: set[tuple[str, str]] = set()
    result: list[dict[str, Any]] = []
    for raw in signals:
        item = normalize_signal(raw)
        namespace = item["sourceInstanceId"] or item["sourceKind"]
        candidates = []
        if item["externalId"]:
            candidates.append((namespace, f"id:{item['externalId']}"))
        if item["canonicalUrl"]:
            candidates.append((namespace, f"url:{item['canonicalUrl']}"))
        candidates.append((namespace, f"hash:{item['contentHash']}"))
        if any(candidate in seen for candidate in candidates):
            continue
        seen.update(candidates)
        result.append(item)
    return result


def _words(value: Any) -> list[str]:
    return [token for token in _WORD_RE.findall(normalize_text(value)) if token not in _STOPWORDS and len(token) > 1]


def _features(value: Any) -> list[str]:
    normalized = normalize_text(value)
    words = [f"w:{word}" for word in _words(normalized)]
    compact = normalized.replace(" ", "_")
    chars = [f"c:{compact[index : index + size]}" for size in (3, 4, 5) for index in range(max(0, len(compact) - size + 1))]
    return words + chars


def tfidf_vectors(values: Sequence[Any]) -> list[dict[str, float]]:
    """Build word + character n-gram TF-IDF vectors using deterministic math."""

    documents = [_features(value) for value in values]
    document_frequency = Counter()
    for features in documents:
        document_frequency.update(set(features))
    count = len(documents)
    vectors: list[dict[str, float]] = []
    for features in documents:
        term_counts = Counter(features)
        total = sum(term_counts.values()) or 1
        vector = {}
        for term, frequency in term_counts.items():
            tf = frequency / total
            idf = math.log((1 + count) / (1 + document_frequency[term])) + 1
            vector[term] = tf * idf
        # Keep character n-grams useful for morphology without letting their
        # larger cardinality drown out shared words.  The approved v1 method
        # is word + character TF-IDF, blended at a fixed 75/25 modality split.
        word_norm = math.sqrt(sum(value * value for term, value in vector.items() if term.startswith("w:")))
        char_norm = math.sqrt(sum(value * value for term, value in vector.items() if term.startswith("c:")))
        blended = {
            term: (value / word_norm * 0.75 if term.startswith("w:") and word_norm else value / char_norm * 0.25)
            for term, value in vector.items()
            if (term.startswith("w:") and word_norm) or (term.startswith("c:") and char_norm)
        }
        norm = math.sqrt(sum(value * value for value in blended.values()))
        vectors.append({term: value / norm for term, value in blended.items()} if norm else {})
    return vectors


def cosine_similarity(left: Mapping[str, float], right: Mapping[str, float]) -> float:
    if not left or not right:
        return 0.0
    if len(left) > len(right):
        left, right = right, left
    return max(0.0, min(1.0, sum(value * right.get(term, 0.0) for term, value in left.items())))


def _centroid(vectors: Sequence[Mapping[str, float]]) -> dict[str, float]:
    if not vectors:
        return {}
    totals: defaultdict[str, float] = defaultdict(float)
    for vector in vectors:
        for term, value in vector.items():
            totals[term] += value
    divisor = len(vectors)
    raw = {term: value / divisor for term, value in totals.items()}
    norm = math.sqrt(sum(value * value for value in raw.values()))
    return {term: value / norm for term, value in raw.items()} if norm else {}


def _signal_sort_key(item: Mapping[str, Any]) -> tuple[str, str, str]:
    return (
        _as_text(item.get("contentHash", item.get("content_hash", ""))),
        _as_text(item.get("canonicalUrl", item.get("canonical_url", ""))),
        _as_text(item.get("externalId", item.get("external_id", ""))),
    )


def cluster_signals(
    signals: Sequence[Mapping[str, Any]],
    *,
    threshold: float = CLUSTER_SIMILARITY_THRESHOLD,
) -> list[dict[str, Any]]:
    """Agglomeratively cluster signals against centroids at a fixed threshold."""

    normalized = [normalize_signal(item) for item in signals]
    ordered = sorted(normalized, key=_signal_sort_key)
    if not ordered:
        return []
    # Titles are the adapter-independent demand summary, so repeat them in
    # the feature document to keep a shared demand phrase from being diluted
    # by platform-specific prose in the excerpt.
    vectors = tfidf_vectors([f"{item['title']} {item['title']} {item['title']} {item['excerpt']} {item['context']}" for item in ordered])
    groups: list[dict[str, Any]] = [
        {"indices": [index], "vectors": [vectors[index]]} for index in range(len(ordered))
    ]
    while len(groups) > 1:
        best: tuple[float, int, int] | None = None
        for left_index in range(len(groups) - 1):
            left_centroid = _centroid(groups[left_index]["vectors"])
            for right_index in range(left_index + 1, len(groups)):
                similarity = cosine_similarity(left_centroid, _centroid(groups[right_index]["vectors"]))
                candidate = (similarity, -left_index, -right_index)
                if similarity >= threshold and (best is None or candidate > best):
                    best = candidate
        if best is None:
            break
        _, left_negative, right_negative = best
        left_index, right_index = -left_negative, -right_negative
        groups[left_index]["indices"].extend(groups[right_index]["indices"])
        groups[left_index]["vectors"].extend(groups[right_index]["vectors"])
        del groups[right_index]

    clusters: list[dict[str, Any]] = []
    for group in groups:
        members = [ordered[index] for index in sorted(group["indices"])]
        member_hashes = sorted(item["contentHash"] for item in members)
        stable_key = hashlib.sha256("|".join(member_hashes).encode("utf-8")).hexdigest()[:24]
        title = max((item["title"] for item in members), key=lambda value: (len(value), value), default="Untitled demand")
        sources = sorted({item["sourceInstanceId"] or item["sourceKind"] for item in members})
        clusters.append(
            {
                "stableKey": stable_key,
                "title": title,
                "members": members,
                "signalIds": [item["externalId"] or item["contentHash"] for item in members],
                "independentSignalCount": len(members),
                "independentSourceCount": len(sources),
                "sourceInstances": sources,
                "centroid": _centroid(group["vectors"]),
                "algorithmVersion": PIPELINE_VERSION,
            }
        )
    return sorted(clusters, key=lambda cluster: cluster["stableKey"])


def _parse_time(value: Any, fallback: datetime) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = _as_text(value).strip()
        if not raw:
            return fallback
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return fallback
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def _engagement_value(signals: Sequence[Mapping[str, Any]]) -> float:
    values: list[float] = []
    for item in signals:
        engagement = item.get("engagement") or {}
        candidate = engagement.get("normalized")
        if candidate is None:
            candidate = engagement.get("score")
        if isinstance(candidate, (int, float)) and not isinstance(candidate, bool):
            values.append(float(candidate))
    if not values:
        return 0.0
    return max(0.0, min(1.0, sum(values) / len(values)))


def score_components(
    signals: Sequence[Mapping[str, Any]],
    *,
    now: datetime | None = None,
    recent_count: int | None = None,
    previous_count: int | None = None,
) -> dict[str, float]:
    """Return the approved explainable score components in the range 0..1."""

    clock = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    count = len(signals)
    source_count = len({_as_text(item.get("sourceInstanceId", item.get("sourceKind", "unknown"))) for item in signals})
    latest = max((_parse_time(item.get("publishedAt"), clock) for item in signals), default=clock)
    days_since_last = max(0.0, (clock - latest).total_seconds() / 86_400)
    if recent_count is None or previous_count is None:
        recent_count = sum(
            1
            for item in signals
            if (clock - _parse_time(item.get("publishedAt"), clock)).total_seconds() <= 7 * 86_400
        )
        previous_count = sum(
            1
            for item in signals
            if 7 * 86_400 < (clock - _parse_time(item.get("publishedAt"), clock)).total_seconds() <= 14 * 86_400
        )
    if previous_count == 0:
        momentum = 1.0 if recent_count > 0 else 0.0
    else:
        ratio = max(0.0, recent_count / previous_count)
        momentum = ratio / (ratio + 1.0)
    return {
        "volume": 1.0 - math.exp(-count / 5.0),
        "sourceDiversity": min(source_count / 4.0, 1.0),
        "recency": math.exp(-days_since_last / 30.0) if signals else 0.0,
        "momentum": max(0.0, min(1.0, momentum)),
        "engagement": _engagement_value(signals),
    }


def score_cluster(
    cluster_or_signals: Mapping[str, Any] | Sequence[Mapping[str, Any]],
    *,
    now: datetime | None = None,
    recent_count: int | None = None,
    previous_count: int | None = None,
) -> dict[str, Any]:
    """Apply the approved 0..100 score formula and retain its explanation."""

    if isinstance(cluster_or_signals, Mapping):
        signals = list(cluster_or_signals.get("members", cluster_or_signals.get("signals", [])))
    else:
        signals = list(cluster_or_signals)
    components = score_components(
        signals,
        now=now,
        recent_count=recent_count,
        previous_count=previous_count,
    )
    weights = {
        "volume": 0.35,
        "sourceDiversity": 0.25,
        "recency": 0.20,
        "momentum": 0.15,
        "engagement": 0.05,
    }
    score = round(100 * sum(components[key] * weights[key] for key in weights))
    return {
        "score": max(0, min(100, score)),
        "scoreExplanation": {key: {"value": round(components[key], 6), "weight": weight} for key, weight in weights.items()},
        "components": components,
    }


def trend_for_cluster(
    signals: Sequence[Mapping[str, Any]],
    *,
    now: datetime | None = None,
    history: Sequence[Mapping[str, Any]] = (),
) -> str:
    """Classify trend using the fixed 14-day history and 1.2/0.8 bounds."""

    clock = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    timestamps = [_parse_time(item.get("publishedAt"), clock) for item in signals]
    if history:
        first = min((_parse_time(item.get("day", item.get("createdAt")), clock) for item in history), default=clock)
    elif timestamps:
        first = min(timestamps)
    else:
        first = clock
    if (clock - first).total_seconds() < 14 * 86_400:
        return "new"
    recent = sum(1 for timestamp in timestamps if (clock - timestamp).total_seconds() <= 7 * 86_400)
    previous = sum(
        1
        for timestamp in timestamps
        if 7 * 86_400 < (clock - timestamp).total_seconds() <= 14 * 86_400
    )
    if history:
        recent_history = [
            item
            for item in history
            if (clock - _parse_time(item.get("day", item.get("createdAt")), clock)).total_seconds() <= 7 * 86_400
        ]
        previous_history = [
            item
            for item in history
            if 7 * 86_400 < (clock - _parse_time(item.get("day", item.get("createdAt")), clock)).total_seconds() <= 14 * 86_400
        ]
        if recent_history:
            recent = sum(int(item.get("signalCount", item.get("signal_count", 0)) or 0) for item in recent_history)
        if previous_history:
            previous = sum(int(item.get("signalCount", item.get("signal_count", 0)) or 0) for item in previous_history)
    if recent == 0 and previous == 0:
        return "stable"
    if recent >= previous * 1.2:
        return "rising"
    if recent <= previous * 0.8:
        return "falling"
    return "stable"


def _context_similarity(cluster: Mapping[str, Any], item: Mapping[str, Any]) -> float:
    cluster_text = _as_text(cluster.get("title", "")) + " " + " ".join(
        _as_text(member.get("excerpt", "")) for member in cluster.get("members", cluster.get("signals", []))
    )
    item_text = _as_text(item.get("text", item.get("title", "")))
    vectors = tfidf_vectors([cluster_text, item_text])
    return cosine_similarity(vectors[0], vectors[1])


def classify_opportunity(
    cluster: Mapping[str, Any],
    context_items: Sequence[Mapping[str, Any]],
    *,
    threshold: float = OPPORTUNITY_SIMILARITY_THRESHOLD,
) -> dict[str, Any]:
    """Classify public-first, then private-roadmap demand without leaking text."""

    public_matches: list[tuple[float, Mapping[str, Any]]] = []
    private_matches: list[tuple[float, Mapping[str, Any]]] = []
    for item in context_items:
        visibility = _as_text(item.get("visibility", "public")).casefold()
        kind = _as_text(item.get("kind", "")).casefold()
        similarity = _context_similarity(cluster, item)
        if visibility != "private" and kind != "roadmap":
            public_matches.append((similarity, item))
        if visibility == "private" or kind == "roadmap":
            private_matches.append((similarity, item))
    public = max(public_matches, key=lambda pair: (pair[0], _as_text(pair[1].get("id"))), default=(0.0, {}))
    private = max(private_matches, key=lambda pair: (pair[0], _as_text(pair[1].get("id"))), default=(0.0, {}))
    if public[0] >= threshold:
        state = "existing"
        related = public[1].get("id")
        matching = public[0]
        action = "Join the conversation and explain the existing solution."
    elif private[0] >= threshold:
        state = "roadmap"
        related = private[1].get("id")
        matching = private[0]
        action = "Review whether this roadmap item deserves higher priority."
    else:
        state = "unmapped"
        related = None
        matching = max(public[0], private[0])
        action = "Investigate this repeated unmet need as a new product opportunity."
    return {
        "opportunityState": state,
        "relatedContextId": related,
        "matchingSimilarity": round(matching, 6),
        "suggestedAction": action,
        "privateMatchSuppressed": state != "roadmap" and private[0] >= threshold,
    }


def process_evidence(
    signals: Iterable[Mapping[str, Any]],
    *,
    context_items: Sequence[Mapping[str, Any]] = (),
    history_by_cluster: Mapping[str, Sequence[Mapping[str, Any]]] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Run the complete deterministic normalization → cluster → score pipeline."""

    raw_signals = list(signals)
    deduped = deduplicate_signals(raw_signals)
    clusters = cluster_signals(deduped)
    history_by_cluster = history_by_cluster or {}
    enriched: list[dict[str, Any]] = []
    for cluster in clusters:
        scored = score_cluster(cluster, now=now)
        classification = classify_opportunity(cluster, context_items)
        history = history_by_cluster.get(cluster["stableKey"], ())
        cluster.update(scored)
        cluster.update(classification)
        cluster["trend"] = trend_for_cluster(cluster["members"], now=now, history=history)
        cluster["firstDetectedAt"] = min(
            (item.get("publishedAt") or item.get("collectedAt") for item in cluster["members"]),
            default=None,
        )
        cluster["lastDetectedAt"] = max(
            (item.get("publishedAt") or item.get("collectedAt") for item in cluster["members"]),
            default=None,
        )
        enriched.append(cluster)
    return {
        "pipelineVersion": PIPELINE_VERSION,
        "normalizedSignals": deduped,
        "rawSignalCount": len(raw_signals),
        "normalizedSignalCount": len(deduped),
        "duplicateCount": max(0, len(raw_signals) - len(deduped)),
        "clusters": enriched,
    }


__all__ = [
    "CLUSTER_SIMILARITY_THRESHOLD",
    "NormalizedSignal",
    "OPPORTUNITY_SIMILARITY_THRESHOLD",
    "PIPELINE_VERSION",
    "canonicalize_url",
    "classify_opportunity",
    "cluster_signals",
    "content_hash",
    "cosine_similarity",
    "deduplicate_signals",
    "normalize_signal",
    "normalize_text",
    "process_evidence",
    "score_cluster",
    "score_components",
    "tfidf_vectors",
    "trend_for_cluster",
]
