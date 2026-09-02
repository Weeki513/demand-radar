import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_SOURCE_CONFIGS } from "../../src/sources/default-configs"

test("new products receive a complete default source set", () => {
  assert.equal(DEFAULT_SOURCE_CONFIGS.length, 5)
  assert.equal(new Set(DEFAULT_SOURCE_CONFIGS.map((config) => config.adapter_key)).size, 5)
  assert.ok(DEFAULT_SOURCE_CONFIGS.every((config) => config.display_name && Object.keys(config.config).length > 0))
})
