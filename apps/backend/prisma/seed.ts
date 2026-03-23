import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed başladı...");

  const user = await prisma.user.upsert({
    where: { email: "test@aicompany.dev" },
    update: {},
    create: {
      email: "test@aicompany.dev",
      name: "Test Kullanıcı",
      plan: "PRO",
    },
  });
  console.log("✓ Kullanıcı:", user.email);

  const project = await prisma.project.upsert({
    where: { id: "proj-001" },
    update: {},
    create: {
      id: "proj-001",
      ownerId: user.id,
      name: "Web App Projesi",
      description: "Test projesi",
    },
  });
  console.log("✓ Proje:", project.name);

  await Promise.all([
    prisma.agent.upsert({
      where: { id: "agent-001" },
      update: {},
      create: {
        id: "agent-001",
        projectId: project.id,
        name: "Backend Dev 1",
        role: "backend-dev",
        model: "GPT_4",
        goal: "REST API ve backend servisleri yaz",
        efficiency: 8,
      },
    }),
    prisma.agent.upsert({
      where: { id: "agent-002" },
      update: {},
      create: {
        id: "agent-002",
        projectId: project.id,
        name: "Backend Dev 2",
        role: "backend-dev",
        model: "GPT_3_5_TURBO",
        goal: "REST API ve backend servisleri yaz",
        efficiency: 3,
      },
    }),
    prisma.agent.upsert({
      where: { id: "agent-003" },
      update: {},
      create: {
        id: "agent-003",
        projectId: project.id,
        name: "Frontend Dev",
        role: "frontend-dev",
        model: "GEMINI_PRO",
        goal: "UI bileşenleri ve sayfa tasarımları yap",
        efficiency: 4,
      },
    }),
  ]);

  console.log("✓ 3 agent oluşturuldu");
  console.log("\nSeed tamamlandı!");
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });