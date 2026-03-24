import { Router } from "express";
import { prisma } from "../../db/prisma";

export const agentRoutes = Router();

// Projenin agent'larını getir
agentRoutes.get("/project/:projectId", async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where:   { projectId: req.params.projectId },
      orderBy: { createdAt: "asc" },
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: "Agent'lar alınamadı" });
  }
});

// Yeni agent oluştur
agentRoutes.post("/", async (req, res) => {
  try {
    const { projectId, name, role, model, goal, efficiency } = req.body;
    if (!projectId || !name || !role || !model || !goal) {
      return res.status(400).json({ error: "Zorunlu alanlar eksik" });
    }
    const agent = await prisma.agent.create({
      data: { projectId, name, role, model, goal, efficiency: efficiency ?? 5 },
    });
    res.status(201).json(agent);
  } catch (err) {
    res.status(500).json({ error: "Agent oluşturulamadı" });
  }
});

// Agent sil
agentRoutes.delete("/:id", async (req, res) => {
  try {
    await prisma.agent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Agent silinemedi" });
  }
});