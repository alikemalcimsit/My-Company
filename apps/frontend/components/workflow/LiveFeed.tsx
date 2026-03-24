"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket }                  from "socket.io-client";
import { ActivityEvent }               from "@/lib/types";
import { Bot, Zap, CheckCircle, Database } from "lucide-react";

interface Props {
  projectId: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  "agent:start":      <Bot size={12} className="text-violet-400" />,
  "agent:done":       <CheckCircle size={12} className="text-green-400" />,
  "task:start":       <Zap size={12} className="text-yellow-400" />,
  "task:done":        <CheckCircle size={12} className="text-green-400" />,
  "cache:hit":        <Database size={12} className="text-blue-400" />,
  "optimizer:filter": <Zap size={12} className="text-orange-400" />,
};

export default function LiveFeed({ projectId }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const bottomRef           = useRef<HTMLDivElement>(null);
  const socketRef           = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:project", projectId);
    });

    socket.on("activity", (event: ActivityEvent) => {
      setEvents(prev => [...prev.slice(-49), event]); // son 50 eventi tut
    });

    return () => { socket.disconnect(); };
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">Canlı Akış</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Canlı</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {events.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-8">
            Görev çalıştırınca burası dolacak...
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-900 transition-colors"
            >
              <div className="mt-0.5 flex-shrink-0">
                {EVENT_ICONS[event.type] ?? <Zap size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300">{event.message}</p>
                {event.tokenUsed !== undefined && event.tokenUsed > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">{event.tokenUsed} token</p>
                )}
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0">
                {new Date(event.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}