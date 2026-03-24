import dotenv from "dotenv";
dotenv.config();

import http             from "http";
import { createServer } from "./api/server";
import { initSocket }   from "./api/socket";
import { prisma }       from "./db/prisma";

const PORT = process.env.PORT ?? 3001;

async function main() {
  await prisma.$connect();
  console.log("✓ Veritabanı bağlantısı kuruldu");

  const app        = createServer();
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`✓ Server çalışıyor: http://localhost:${PORT}`);
  });
}

main().catch(console.error);