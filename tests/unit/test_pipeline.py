import json
from datetime import datetime, timezone
from pathlib import Path
import unittest

from processor.pipeline import (
    classify_opportunity,
    cluster_signals,
    content_hash,
    deduplicate_signals,
    normalize_text,
    process_evidence,
    score_cluster,
    trend_for_cluster,
)


FIXTURE_PATH = Path(__file__).parents[1] / "fixtures" / "signals.json"
NOW = datetime(2026, 9, 1, tzinfo=timezone.utc)


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.signals = json.loads(FIXTURE_PATH.read_text())

    def test_text_and_hash_are_stable(self):
        self.assertEqual(normalize_text("  Hello <b>WORLD</b>! "), "hello world")
        self.assertEqual(content_hash("Hello", "World"), content_hash(" hello ", "<p>world</p>"))

    def test_dedup_uses_source_namespace_but_keeps_cross_source_evidence(self):
        deduped = deduplicate_signals(self.signals)
        self.assertEqual(len(deduped), 5)
        self.assertEqual(len({item["sourceInstanceId"] for item in deduped}), 4)

    def test_clustering_is_deterministic_and_cross_source(self):
        deduped = deduplicate_signals(self.signals)
        first = cluster_signals(deduped)
        second = cluster_signals(list(reversed(deduped)))
        self.assertEqual([cluster["stableKey"] for cluster in first], [cluster["stableKey"] for cluster in second])
        self.assertGreaterEqual(max(cluster["independentSignalCount"] for cluster in first), 3)

    def test_approved_score_weights_are_explainable(self):
        result = score_cluster(self.signals[:4], now=NOW, recent_count=4, previous_count=2)
        explanation = result["scoreExplanation"]
        self.assertEqual(explanation["volume"]["weight"], 0.35)
        self.assertEqual(explanation["sourceDiversity"]["weight"], 0.25)
        self.assertEqual(explanation["recency"]["weight"], 0.20)
        self.assertEqual(explanation["momentum"]["weight"], 0.15)
        self.assertEqual(explanation["engagement"]["weight"], 0.05)
        self.assertGreaterEqual(result["score"], 0)
        self.assertLessEqual(result["score"], 100)

    def test_trend_policy(self):
        recent = self.signals[:3]
        self.assertEqual(trend_for_cluster(recent, now=NOW), "new")
        old_signals = [dict(item, publishedAt="2026-08-01T08:00:00Z") for item in recent]
        self.assertEqual(trend_for_cluster(old_signals, now=NOW), "stable")

    def test_public_precedence_over_private_roadmap(self):
        cluster = next(cluster for cluster in cluster_signals(self.signals[:4]) if "authenticated" in cluster["title"].casefold())
        result = classify_opportunity(
            cluster,
            [
                {"id": "public-auth", "kind": "capability", "visibility": "public", "text": "Persistent authenticated browser sessions"},
                {"id": "private-auth", "kind": "roadmap", "visibility": "private", "text": "Persistent authenticated browser sessions"},
            ],
        )
        self.assertEqual(result["opportunityState"], "existing")
        self.assertEqual(result["relatedContextId"], "public-auth")

    def test_pipeline_accepts_generators_without_losing_counts(self):
        result = process_evidence((signal for signal in self.signals), now=NOW)
        self.assertEqual(result["rawSignalCount"], len(self.signals))
        self.assertEqual(result["duplicateCount"], 1)
        self.assertGreaterEqual(result["normalizedSignalCount"], 1)


if __name__ == "__main__":
    unittest.main()
