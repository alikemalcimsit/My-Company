"use client";

import { useEffect, useState }   from "react";
import { useParams }             from "next/navigation";
import { api, Agent, Task, Stats } from "@/lib/api";
import WorkflowBuilder           from "@/components/workflow/WorkflowBuilder";
import AgentPanel                from "@/components/agents/AgentPanel";
import { Bot, Zap, Clock, DollarSign } from "lucide-react";
import CoderPanel from "@/components/coder/CoderPanel";

type Tab = "workflow" | "agents" | "tasks" | "cost" | "coder";

export default function ProjectPage() {
  const { id }                  = useParams<{ id: string }>();
  const [agents,  setAgents]    = useState<Agent[]>([]);
  const [tasks,   setTasks]     = useState<Task[]>([]);
  const [stats,   setStats]     = useState<Stats | null>(null);
  const [tab,     setTab]       = useState<Tab>("workflow");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAgents(id),
      api.getTasks(id),
      api.getStats(id),
    ]).then(([a, t, s]) => {
      setAgents(a);
      setTasks(t);
      setStats(s);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Yükleniyor...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Bot size={16} />
          </div>
          <span className="font-semibold">AI Company</span>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Zap size={12} className="text-violet-400" />
              {stats.totalTokens.toLocaleString()} token
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-blue-400" />
              {stats.avgDurationMs}ms ort.
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={12} className="text-green-400" />
              ${stats.estimatedCostUsd.toFixed(4)}
            </span>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6 flex gap-1">
        {(["workflow", "agents", "tasks", "coder", "cost"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm capitalize transition-colors border-b-2 ${
              tab === t
                ? "border-violet-500 text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {t === "workflow" ? "Workflow" : t === "agents" ? "Çalışanlar" : t === "tasks" ? "Görevler" : t === "coder" ? "Coder" : "Maliyet"}
          </button>
        ))}
      </div>

      {/* İçerik */}
      <div className="flex-1">
        {tab === "workflow" && (
          <WorkflowBuilder
            projectId={id}
            agents={agents}
            onTaskComplete={(task) => setTasks(prev => [task, ...prev])}
          />
        )}
        {tab === "agents" && (
          <AgentPanel
            projectId={id}
            agents={agents}
            onAgentsChange={setAgents}
          />
        )}

        {tab === "coder" && (
  <CoderPanel projectId={id} agents={agents} />
)}
        {tab === "tasks" && (
          <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Son Görevler</h2>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz görev yok.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="border border-gray-800 rounded-xl p-4 bg-gray-900">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === "DONE"
                          ? "bg-green-900 text-green-400"
                          : task.status === "FAILED"
                          ? "bg-red-900 text-red-400"
                          : "bg-yellow-900 text-yellow-400"
                      }`}>
                        {task.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {task.totalTokenUsed} token
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{task.input}</p>
                    {task.output && (
                      <p className="text-xs text-gray-500 line-clamp-2">{task.output}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}