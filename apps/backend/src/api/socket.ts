import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin:  "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Bağlandı: ${socket.id}`);

    socket.on("join:project", (projectId: string) => {
      socket.join(projectId);
      console.log(`[Socket] ${socket.id} → proje: ${projectId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Ayrıldı: ${socket.id}`);
    });
  });

  return io;
}

// Diğer dosyalardan event göndermek için
export function emitToProject(projectId: string, event: string, data: any) {
  if (io) {
    io.to(projectId).emit(event, data);
  }
}