import assert from "node:assert/strict"
import test from "node:test"

import { translate } from "../../src/lib/i18n"

test("Russian locale translates core UI and dynamic summaries", () => {
  assert.equal(translate("ru", "Demand signals"), "Сигналы спроса")
  assert.equal(translate("ru", "16 clusters · 25 independent signals · 5 sources"), "16 кластеров · 25 независимых сигналов · 5 источников")
  assert.equal(translate("ru", "14 high-confidence opportunities"), "14 возможностей с высокой уверенностью")
})

test("English locale and unknown product content remain unchanged", () => {
  assert.equal(translate("en", "Demand signals"), "Demand signals")
  assert.equal(translate("ru", "Resumable browser queues"), "Resumable browser queues")
})
