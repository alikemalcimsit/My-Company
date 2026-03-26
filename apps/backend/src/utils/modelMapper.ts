import { ModelName } from "../types";

export function mapPrismaModelToAppModel(prismaModel: string): ModelName {
  const mapping: Record<string, ModelName> = {
    "GPT_4": "gpt-4",
    "GPT_3_5_TURBO": "gpt-3.5-turbo",
    "GEMINI_PRO": "gemini-pro",
    "CLAUDE_SONNET": "claude-sonnet",
    "LOCAL_LLM": "local-llm",
  };
  return mapping[prismaModel] || "gpt-3.5-turbo";
}

export function mapAppModelToPrismaModel(appModel: string): string {
  const mapping: Record<string, string> = {
    "gpt-4": "GPT_4",
    "gpt-3.5-turbo": "GPT_3_5_TURBO",
    "gemini-pro": "GEMINI_PRO",
    "claude-sonnet": "CLAUDE_SONNET",
    "local-llm": "LOCAL_LLM",
  };
  return mapping[appModel] || "GPT_3_5_TURBO";
}