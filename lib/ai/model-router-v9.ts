import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type CouncilModelPreference = "creative" | "critical";

function deepSeekModel(): LanguageModel | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const provider = createOpenAICompatible({
    name: "travel-reasoner",
    apiKey,
    baseURL: `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}`.replace(/\/$/, ""),
    supportsStructuredOutputs: true,
  });
  return provider(process.env.DEEPSEEK_COUNCIL_MODEL || "deepseek-v4-flash");
}

function openAIModel(): LanguageModel | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const provider = createOpenAI({ apiKey });
  return provider(process.env.OPENAI_COUNCIL_MODEL || process.env.OPENAI_VERIFY_MODEL || "gpt-5.4-nano");
}

function selfHostedModel(): LanguageModel | null {
  const baseURL = process.env.SELF_HOSTED_AI_BASE_URL;
  const model = process.env.SELF_HOSTED_AI_MODEL;
  if (!baseURL || !model) return null;
  const provider = createOpenAICompatible({
    name: "travel-local",
    apiKey: process.env.SELF_HOSTED_AI_API_KEY || "local",
    baseURL: baseURL.replace(/\/$/, ""),
    supportsStructuredOutputs: true,
  });
  return provider(model);
}

export function councilModels(preference: CouncilModelPreference): LanguageModel[] {
  const cloud = preference === "creative" ? [deepSeekModel(), openAIModel()] : [openAIModel(), deepSeekModel()];
  return [...cloud, selfHostedModel()].filter((model): model is LanguageModel => Boolean(model));
}
