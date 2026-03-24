const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export const api = {
  // Projects
  getProjects: () =>
    request<Project[]>("/api/projects"),

  getProject: (id: string) =>
    request<Project>(`/api/projects/${id}`),

  createProject: (data: { name: string; description?: string; ownerId: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),

  // Agents
  getAgents: (projectId: string) =>
    request<Agent[]>(`/api/agents/project/${projectId}`),

  createAgent: (data: CreateAgentInput) =>
    request<Agent>("/api/agents", { method: "POST", body: JSON.stringify(data) }),

  deleteAgent: (id: string) =>
    request(`/api/agents/${id}`, { method: "DELETE" }),

  // Tasks
  getTasks: (projectId: string) =>
    request<Task[]>(`/api/tasks/project/${projectId}`),

  runTask: (projectId: string, input: string) =>
    request<TaskResult>("/api/tasks/run", {
      method: "POST",
      body: JSON.stringify({ projectId, input }),
    }),

  getStats: (projectId: string) =>
    request<Stats>(`/api/tasks/stats/${projectId}`),
};

// Tipler
export interface Project {
  id:          string;
  name:        string;
  description: string | null;
  createdAt:   string;
  _count?:     { agents: number; tasks: number };
}

export interface Agent {
  id:         string;
  name:       string;
  role:       string;
  model:      string;
  goal:       string;
  efficiency: number;
}

export interface Task {
  id:            string;
  input:         string;
  output:        string | null;
  status:        string;
  totalTokenUsed: number;
  createdAt:     string;
}

export interface TaskResult {
  task:   Task;
  result: { output: string; model: string; tokenUsed: number; durationMs: number };
}

export interface Stats {
  totalTokens:      number;
  avgDurationMs:    number;
  totalCalls:       number;
  estimatedCostUsd: number;
}

export interface CreateAgentInput {
  projectId:  string;
  name:       string;
  role:       string;
  model:      string;
  goal:       string;
  efficiency: number;
}