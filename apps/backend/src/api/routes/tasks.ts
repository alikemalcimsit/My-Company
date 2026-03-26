import { Router } from "express";
import { prisma } from "../../db/prisma";
import { orchestrate } from "../../orchestrator/orchestrator";
import { Agent, ModelName } from "../../types";
import { runCoderAgent, CoderTask } from "../../agents/coderAgent";

export const taskRoutes = Router();

// Projenin task'larını getir
taskRoutes.get("/project/:projectId", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
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
      id: a.id,
      name: a.name,
      role: a.role,
      model: "gemini-pro" as const,
      goal: a.goal,
      efficiency: a.efficiency,
    }));

    // Orchestrator'ı çalıştır
    const result = await orchestrate(
      { id: task.id, projectId, input, status: "running" },
      agents,
      projectId
    );
    
    // Task'ı güncelle
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        output: result.output,
        status: "DONE",
        totalTokenUsed: result.tokenUsed,
      },
    });

    // Log kaydet
    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        agentId: result.agentId,
        action: "llm_call",
        model: result.model,
        tokenUsed: result.tokenUsed,
        durationMs: result.durationMs,
      },
    });

    res.status(201).json({
      task: updated,
      result: {
        output: result.output,
        model: result.model,
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
      _sum: { tokenUsed: true },
      _avg: { durationMs: true },
      _count: true,
    });

    res.json({
      totalTokens: stats._sum.tokenUsed ?? 0,
      avgDurationMs: Math.round(stats._avg.durationMs ?? 0),
      totalCalls: stats._count,
      estimatedCostUsd: ((stats._sum.tokenUsed ?? 0) / 1000) * 0.002,
    });
  } catch (err) {
    res.status(500).json({ error: "İstatistikler alınamadı" });
  }
});

// Agent bazlı token breakdown
taskRoutes.get("/stats/agents/:projectId", async (req, res) => {
  try {
    const breakdown = await prisma.taskLog.groupBy({
      by: ["agentId"],
      where: { task: { projectId: req.params.projectId } },
      _sum: { tokenUsed: true },
      _count: true,
      orderBy: { _sum: { tokenUsed: "desc" } },
    });

    const agentIds = breakdown.map(b => b.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, model: true },
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    const result = breakdown.map(b => ({
      agentId: b.agentId,
      agentName: agentMap.get(b.agentId)?.name ?? "Bilinmiyor",
      model: agentMap.get(b.agentId)?.model ?? "Bilinmiyor",
      totalTokens: b._sum.tokenUsed ?? 0,
      totalCalls: b._count,
      estimatedCost: ((b._sum.tokenUsed ?? 0) / 1000) * 0.002,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Agent breakdown alınamadı" });
  }
});

// Zaman bazlı token kullanımı
taskRoutes.get("/stats/timeline/:projectId", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.taskLog.findMany({
      where: {
        task: { projectId: req.params.projectId },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        tokenUsed: true,
        action: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const dailyData: Record<string, { date: string; tokens: number; calls: number; savedTokens: number }> = {};

    for (const log of logs) {
      const date = log.createdAt.toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, tokens: 0, calls: 0, savedTokens: 0 };
      }
      dailyData[date].tokens += log.tokenUsed;
      dailyData[date].calls += 1;
      if (log.action === "cache_hit" || log.action === "pre_filter") {
        dailyData[date].savedTokens += log.tokenUsed;
      }
    }

    const timeline = Object.values(dailyData);
    res.json(timeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Timeline alınamadı" });
  }
});

// Maliyet tahmini ve öneriler
taskRoutes.get("/stats/insights/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30Days = await prisma.taskLog.aggregate({
      where: {
        task: { projectId },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { tokenUsed: true },
    });

    const total = await prisma.taskLog.aggregate({
      where: { task: { projectId } },
      _sum: { tokenUsed: true },
    });

    const totalTokens = total._sum.tokenUsed ?? 0;
    const monthlyTokens = last30Days._sum.tokenUsed ?? 0;
    const monthlyCost = (monthlyTokens / 1000) * 0.002;
    const projectedYearly = monthlyCost * 12;

    const modelBreakdown = await prisma.taskLog.groupBy({
      by: ["model"],
      where: { task: { projectId }, model: { not: null } },
      _sum: { tokenUsed: true },
      orderBy: { _sum: { tokenUsed: "desc" } },
    });

    const modelCosts = modelBreakdown.map(m => ({
      model: m.model,
      tokens: m._sum.tokenUsed ?? 0,
      cost: ((m._sum.tokenUsed ?? 0) / 1000) * 0.002,
    }));

    const cacheHits = await prisma.taskLog.count({
      where: { task: { projectId }, action: "cache_hit" },
    });
    const totalCalls = await prisma.taskLog.count({
      where: { task: { projectId } },
    });
    const cacheRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;

    const suggestions: string[] = [];

    if (cacheRate < 20 && totalCalls > 10) {
      suggestions.push(`Cache kullanım oranınız düşük (%${cacheRate.toFixed(0)}). Aynı görevleri tekrarlamaktan kaçının.`);
    }

    const expensiveModels = modelBreakdown.filter(m => 
      m.model === "GPT_4" && (m._sum.tokenUsed ?? 0) > 10000
    );
    if (expensiveModels.length > 0) {
      suggestions.push("GPT-4 kullanımınız yüksek. Basit görevlerde GPT-3.5 veya Gemini kullanarak %70 tasarruf edebilirsiniz.");
    }

    if (monthlyCost > 10) {
      suggestions.push(`Aylık maliyetiniz $${monthlyCost.toFixed(2)}. Token optimizer'ı aktif ederek %40-60 tasarruf edebilirsiniz.`);
    }

    if (suggestions.length === 0) {
      suggestions.push("Optimizasyon durumunuz iyi. Mevcut kullanımınız verimli görünüyor.");
    }

    res.json({
      summary: {
        totalTokens,
        monthlyTokens,
        monthlyCost: monthlyCost.toFixed(4),
        projectedYearly: projectedYearly.toFixed(4),
        totalCalls,
        cacheRate: cacheRate.toFixed(1),
      },
      modelBreakdown: modelCosts,
      suggestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "İçgörüler alınamadı" });
  }
});

// ─── CODER TASK ENDPOINT (TEK BİR TANE) ─────────────────────────────
taskRoutes.post("/coder", async (req, res) => {
  try {
    const { projectId, agentId, task, description, targetFile, code } = req.body;
    
    if (!projectId || !agentId || !task) {
      return res.status(400).json({ error: "projectId, agentId ve task zorunlu" });
    }
    
    // Agent'ı bul
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    
    if (!agent) {
      return res.status(404).json({ error: "Agent bulunamadı" });
    }
    
    // ÖNCE task oluştur (foreign key için)
    const newTask = await prisma.task.create({
      data: {
        projectId,
        input: `[Coder] ${task}: ${description}`,
        type: "CODING",
        status: "RUNNING",
      },
    });
    
    // Coder task oluştur
    const coderTask: CoderTask = {
      type: task,
      description: description || "",
      targetFile: targetFile,
      code: code,
    };
    
    // Model adını dönüştür
    let modelName: ModelName = "local-llm";
    if (agent.model === "GPT_4") modelName = "gpt-4";
    else if (agent.model === "GPT_3_5_TURBO") modelName = "gpt-3.5-turbo";
    else if (agent.model === "GEMINI_PRO") modelName = "gemini-pro";
    else if (agent.model === "CLAUDE_SONNET") modelName = "claude-sonnet";
    else if (agent.model === "LOCAL_LLM") modelName = "local-llm";
    
    // Agent tipini dönüştür
    const agentData: Agent = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      model: modelName,
      goal: agent.goal,
      efficiency: agent.efficiency,
    };
    
    // Coder agent'ı çalıştır
    const result = await runCoderAgent(agentData, coderTask, projectId, newTask.id);
    
    // Task'ı güncelle
    await prisma.task.update({
      where: { id: newTask.id },
      data: {
        output: result.output,
        status: "DONE",
        totalTokenUsed: result.tokenUsed,
        durationMs: result.durationMs,
      },
    });
    
    // Task log'u kaydet
    await prisma.taskLog.create({
      data: {
        taskId: newTask.id,
        agentId: agent.id,
        action: `coder_${task}`,
        model: result.model,
        tokenUsed: result.tokenUsed,
        durationMs: result.durationMs,
      },
    });
    
    // Parse edilmiş sonucu döndür
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(result.output);
    } catch {
      parsedOutput = { raw: result.output };
    }
    
    res.json({
      success: true,
      taskId: newTask.id,
      result: parsedOutput,
      tokenUsed: result.tokenUsed,
      durationMs: result.durationMs,
    });
    
  } catch (err) {
    console.error("[Coder Route] Hata:", err);
    res.status(500).json({ error: "Coder task çalıştırılamadı", details: String(err) });
  }
});