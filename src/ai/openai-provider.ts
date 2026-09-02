import "server-only"

import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import {
  clusterInsightSchema,
  contextRewriteSchema,
  normalizedProductModelSchema,
  productEvidenceSchema,
  postDraftSchema,
  productStructureSchema,
  type TextGenerationProvider,
} from "@/ai/contracts"
import { finalizeProductModel } from "@/ai/product-model"
import { getServerEnv } from "@/lib/env"

const MODEL = "gpt-5.6-luna"

function client() {
  return new OpenAI({ apiKey: getServerEnv().OPENAI_API_KEY })
}

async function parse<T>(
  name: string,
  schema: z.ZodType<T>,
  instructions: string,
  input: string,
): Promise<T> {
  const response = await client().responses.parse({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions,
    input,
    text: { format: zodTextFormat(schema, name) },
  })

  if (!response.output_parsed) {
    throw new Error(`OpenAI returned no structured ${name} result`)
  }

  return schema.parse(response.output_parsed)
}

export class OpenAITextGenerationProvider implements TextGenerationProvider {
  structureProduct(input: Parameters<TextGenerationProvider["structureProduct"]>[0]) {
    return this.buildProductModel(input)
  }

  private async buildProductModel(input: Parameters<TextGenerationProvider["structureProduct"]>[0]) {
    const evidence = await parse(
      "product_evidence",
      productEvidenceSchema,
      "Extract factual evidence from the supplied public product source. Do not choose the final taxonomy, merge concepts, infer private plans, or add claims not supported by the source. Keep exact metrics and benchmark language in sourceText. Each fact must include a short source excerpt and the supplied source URL.",
      JSON.stringify(input),
    )
    const normalized = await parse(
      "normalized_product_model",
      normalizedProductModelSchema,
      "Construct a compact product model from the extracted evidence. Merge paraphrases and aliases. Group implementation details under the broader capability they enable. Keep separate only distinct user jobs or product surfaces. Public capabilities should usually be 5-8 meaningful groups, not individual protocols, knobs, headings, or minor features. Produce 1-3 positioning statements, 3-6 distinct ICPs, 3-6 customer problems, 3-6 evidence-backed differentiators, and 8-15 non-redundant retrieval keywords. Never infer private roadmap; privatePlan must be empty. Generic words such as fast, secure, or scalable are not differentiators without concrete evidence. Every capability and differentiator must cite evidenceIds.",
      JSON.stringify({ input, evidence }),
    )
    const revised = await parse(
      "product_model_qa",
      normalizedProductModelSchema,
      "Perform semantic QA on this proposed product model and revise it in place. Remove duplicates, fragmented capabilities, feature/problem confusion, unsupported claims, generic differentiators, overlapping ICPs, keyword synonym spam, and marketing fluff. Preserve exact grounded metrics and benchmark claims. Optimize for the compact model most useful for recognizing relevant market demand. privatePlan must remain empty. Do not add facts absent from the evidence.",
      JSON.stringify({ evidence, model: normalized }),
    )
    return finalizeProductModel(revised, evidence)
  }

  explainCluster(input: Parameters<TextGenerationProvider["explainCluster"]>[0]) {
    return parse(
      "cluster_insight",
      clusterInsightSchema,
      "Explain an evidence cluster for a product researcher. Use only supplied public capabilities and evidence. Never speculate about private plans.",
      JSON.stringify(input),
    )
  }

  generatePost(input: Parameters<TextGenerationProvider["generatePost"]>[0]) {
    return parse(
      "post_draft",
      postDraftSchema,
      "Draft a concise social post grounded in the supplied public evidence. Never claim a feature is planned or reveal non-public information. Avoid fabricated metrics and quotes.",
      JSON.stringify(input),
    )
  }

  rewritePost(input: Parameters<TextGenerationProvider["rewritePost"]>[0]) {
    return parse(
      "post_rewrite",
      postDraftSchema,
      "Rewrite the supplied draft according to the instruction while preserving factual meaning. Return a preview only. Do not add product roadmap claims or unverifiable facts.",
      JSON.stringify(input),
    )
  }

  rewriteContext(input: Parameters<TextGenerationProvider["rewriteContext"]>[0]) {
    return parse(
      "context_rewrite",
      contextRewriteSchema,
      "Rewrite the supplied product-context field into one concise, specific statement that preserves its factual meaning. Do not invent features, customers, metrics, or roadmap claims. Return only the rewritten field text.",
      JSON.stringify(input),
    )
  }
}
