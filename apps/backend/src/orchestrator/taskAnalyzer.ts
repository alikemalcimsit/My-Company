import { TaskType, ModelName } from "../types";

export interface AnalysisResult {
  type: TaskType;
  recommendedModel: ModelName;
  complexity: "low" | "medium" | "high";
}

export function analyzeTask(input: string): AnalysisResult {
  const text = input.toLowerCase();

  if (text.includes("ui") || text.includes("tasarım") || text.includes("arayüz") || text.includes("frontend")) {
    return { type: "design",   recommendedModel: "gemini-pro",    complexity: "medium" };
  }
  if (text.includes("kod") || text.includes("api") || text.includes("backend") || text.includes("endpoint")) {
    return { type: "coding",   recommendedModel: "gpt-4",         complexity: "high" };
  }
  if (text.includes("analiz") || text.includes("rapor") || text.includes("veri")) {
    return { type: "analysis", recommendedModel: "claude-sonnet", complexity: "medium" };
  }
  if (input.length < 80) {
    return { type: "simple",   recommendedModel: "gpt-3.5-turbo", complexity: "low" };
  }

  return { type: "complex", recommendedModel: "gpt-4", complexity: "high" };
}