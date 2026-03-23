import { Agent, TaskType } from "../types";

const ROLE_MAP: Record<TaskType, string[]> = {
  coding:   ["backend-dev", "fullstack-dev"],
  design:   ["frontend-dev", "ui-designer"],
  analysis: ["analyst", "researcher"],
  simple:   [],
  complex:  [],
};

export function selectAgents(
  allAgents: Agent[],
  taskType: TaskType,
  maxAgents: number = 2
): Agent[] {
  const targetRoles = ROLE_MAP[taskType];

  let candidates = targetRoles.length > 0
    ? allAgents.filter(a => targetRoles.includes(a.role))
    : allAgents;

  // Verimlilik skoruna göre sırala — düşük = ucuz = önce
  candidates = candidates.sort((a, b) => a.efficiency - b.efficiency);

  return candidates.slice(0, maxAgents);
}