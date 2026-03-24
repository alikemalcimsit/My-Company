export type ModelName =
  | "gpt-4"
  | "gpt-3.5-turbo"
  | "gemini-pro"
  | "claude-sonnet"
  | "local-llm";

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

// Mevcut tiplerin altına ekle
export interface ActivityEvent {
  type:      "agent:start" | "agent:done" | "task:start" | "task:done" | "cache:hit" | "optimizer:filter";
  agentName?: string;
  model?:     string;
  message:    string;
  tokenUsed?: number;
  durationMs?: number;
  timestamp:  number;
}