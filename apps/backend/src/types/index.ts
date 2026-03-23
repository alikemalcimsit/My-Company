export type ModelName =
  | "gpt-4"
  | "gpt-3.5-turbo"
  | "gemini-pro"
  | "claude-sonnet";

export type TaskType =
  | "simple"
  | "coding"
  | "design"
  | "analysis"
  | "complex";

export type TaskStatus =
  | "pending"
  | "running"
  | "done"
  | "failed";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: ModelName;
  goal: string;
  efficiency: number;
}

export interface Task {
  id: string;
  projectId: string;
  input: string;
  type?: TaskType;
  status: TaskStatus;
}

export interface AgentResult {
  agentId: string;
  model: ModelName;
  output: string;
  tokenUsed: number;
  durationMs: number;
}