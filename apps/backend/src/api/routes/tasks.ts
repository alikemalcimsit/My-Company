import { Router }          from "express";
import { prisma }          from "../../db/prisma";
import { orchestrate }     from "../../orchestrator/orchestrator";
import { Agent }           from "../../types";

export const taskRoutes = Router();

// Projenin task'larını getir
taskRoutes.get("/project/:projectId", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where:   { projectId: req.params.projectId },
      orderBy: { createdAt: "desc" },
      take:    20,
      include: {
        assignments: {
          include: { agent: true },
        },
      },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Task'lar alınamadı" });
  }
});

// Yeni task oluştur ve çalıştır
taskRoutes.post("/run", async (req, res) => {
  try {
    const { projectId, input } = req.body;
    if (!projectId || !input) {
      return res.status(400).json({ error: "projectId ve input zorunlu" });
    }

    // DB'ye task kaydet
    const task = await prisma.task.create({
      data: { projectId, input, status: "RUNNING" },
    });

    // Agent'ları çek
    const dbAgents = await prisma.agent.findMany({
      where: { projectId },
    });

    const agents: Agent[] = dbAgents.map(a => ({
      id:         a.id,
      name:       a.name,
      role:       a.role,
      model:      "gemini-pro" as const,
      goal:       a.goal,
      efficiency: a.efficiency,
    }));

    // Orchestrator'ı çalıştır
// orchestrate çağrısını şöyle değiştir:
const result = await orchestrate(
  { id: task.id, projectId, input, status: "running" },
  agents,
  projectId  // ← bunu ekle
);
    // Task'ı güncelle
    const updated = await prisma.task.update({
      where: { id: task.id },
      data:  {
        output:         result.output,
        status:         "DONE",
        totalTokenUsed: result.tokenUsed,
      },
    });

    // Log kaydet
    await prisma.taskLog.create({
      data: {
        taskId:    task.id,
        agentId:   result.agentId,
        action:    "llm_call",
        model:     result.model,
        tokenUsed: result.tokenUsed,
        durationMs: result.durationMs,
      },
    });

    res.status(201).json({
      task:   updated,
      result: {
        output:    result.output,
        model:     result.model,
        tokenUsed: result.tokenUsed,
        durationMs: result.durationMs,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Task çalıştırılamadı" });
  }
});

// Token özeti
taskRoutes.get("/stats/:projectId", async (req, res) => {
  try {
    const stats = await prisma.taskLog.aggregate({
      where: { task: { projectId: req.params.projectId } },
      _sum:  { tokenUsed: true },
      _avg:  { durationMs: true },
      _count: true,
    });

    res.json({
      totalTokens:      stats._sum.tokenUsed ?? 0,
      avgDurationMs:    Math.round(stats._avg.durationMs ?? 0),
      totalCalls:       stats._count,
      estimatedCostUsd: ((stats._sum.tokenUsed ?? 0) / 1000) * 0.002,
    });
  } catch (err) {
    res.status(500).json({ error: "İstatistikler alınamadı" });
  }
});