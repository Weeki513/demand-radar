import "server-only"

import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import {
  clusterInsightSchema,
  contextRewriteSchema,
  postDraftSchema,
  productStructureSchema,
  type TextGenerationProvider,
} from "@/ai/contracts"
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
    return parse(
      "product_structure",
      productStructureSchema,
      "Extract only product facts supported by the supplied bounded public text. Keep list items concise. Do not invent capabilities or customers.",
      JSON.stringify(input),
    )
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
