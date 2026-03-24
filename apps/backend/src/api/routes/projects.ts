import { Router }  from "express";
import { prisma }  from "../../db/prisma";

export const projectRoutes = Router();

// Tüm projeleri getir
projectRoutes.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { agents: true, tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Projeler alınamadı" });
  }
});

// Tek proje getir
projectRoutes.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where:   { id: req.params.id },
      include: { agents: true, tasks: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!project) return res.status(404).json({ error: "Proje bulunamadı" });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: "Proje alınamadı" });
  }
});

// Yeni proje oluştur
projectRoutes.post("/", async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;
    if (!name || !ownerId) {
      return res.status(400).json({ error: "name ve ownerId zorunlu" });
    }
    const project = await prisma.project.create({
      data: { name, description, ownerId },
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: "Proje oluşturulamadı" });
  }
});