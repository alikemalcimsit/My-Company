"use client";

import { useCallback, useState }  from "react";
import {
  ReactFlow, Background, Controls,
  addEdge, useNodesState, useEdgesState,
  Connection, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, Agent, Task }       from "@/lib/api";
import { Play, Loader }           from "lucide-react";
import LiveFeed                   from "./LiveFeed";

const MODEL_COLORS: Record<string, string> = {
  "gpt-4":         "bg-green-900  text-green-400  border-green-700",
  "gpt-3.5-turbo": "bg-blue-900   text-blue-400   border-blue-700",
  "gemini-pro":    "bg-violet-900 text-violet-400 border-violet-700",
  "claude-sonnet": "bg-orange-900 text-orange-400 border-orange-700",
};

interface Props {
  projectId:      string;
  agents:         Agent[];
  onTaskComplete: (task: Task) => void;
}

export default function WorkflowBuilder({ projectId, agents, onTaskComplete }: Props) {
  const [input,   setInput]   = useState("");
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);

  const initialNodes = [
    {
      id:       "input",
      type:     "input",
      position: { x: 250, y: 50 },
      data:     { label: "Görev Girişi" },
      style:    { background: "#1e1b4b", color: "#a5b4fc", border: "1px solid #4c1d95", borderRadius: 8, padding: 12, fontSize: 13 },
    },
    {
      id:       "ceo",
      position: { x: 250, y: 160 },
      data:     { label: "👑 CEO Agent\nTask analizi & dağıtım" },
      style:    { background: "#3b0764", color: "#e879f9", border: "1px solid #7e22ce", borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: "pre-wrap" },
    },
    ...agents.map((agent, i) => ({
      id:       agent.id,
      position: { x: 80 + i * 200, y: 300 },
      data:     { label: `🤖 ${agent.name}\n${agent.role}` },
      style:    { background: "#1e1e2e", color: "#c4b5fd", border: "1px solid #4c1d95", borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: "pre-wrap" },
    })),
    {
      id:       "output",
      type:     "output",
      position: { x: 250, y: 420 + Math.ceil(agents.length / 2) * 20 },
      data:     { label: "Sonuç" },
      style:    { background: "#052e16", color: "#4ade80", border: "1px solid #166534", borderRadius: 8, padding: 12, fontSize: 13 },
    },
  ];

  const initialEdges = [
    {
      id: "e-input-ceo", source: "input", target: "ceo", animated: true,
      style: { stroke: "#7c3aed" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
    },
    ...agents.map(agent => ({
      id: `e-ceo-${agent.id}`, source: "ceo", target: agent.id, animated: true,
      style: { stroke: "#7c3aed" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
    })),
    ...agents.map(agent => ({
      id: `e-${agent.id}-output`, source: agent.id, target: "output", animated: false,
      style: { stroke: "#16a34a" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#16a34a" },
    })),
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  );

  async function runTask() {
    if (!input.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await api.runTask(projectId, input);
      setResult(res.result.output);
      onTaskComplete(res.task);
    } catch (err) {
      setResult("Hata oluştu. Tekrar deneyin.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 112px)" }}>

      {/* Sol panel — input + agent listesi + sonuç */}
      <div className="w-80 border-r border-gray-800 p-5 flex flex-col gap-4 bg-gray-950 overflow-y-auto">
        <div>
          <label className="text-xs text-gray-400 block mb-2">Görev tanımı</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Kullanıcı login API endpoint'i yaz..."
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <button
          onClick={runTask}
          disabled={running || !input.trim()}
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          {running
            ? <><Loader size={14} className="animate-spin" /> Çalışıyor...</>
            : <><Play size={14} /> Çalıştır</>
          }
        </button>

        {/* Agent listesi */}
        <div>
          <p className="text-xs text-gray-400 mb-3">Aktif çalışanlar</p>
          <div className="space-y-2">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-900 border border-gray-800"
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-gray-500">{agent.role}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${
                  MODEL_COLORS[agent.model] ?? "bg-gray-800 text-gray-400 border-gray-700"
                }`}>
                  {agent.model.split("-")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sonuç */}
        {result && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Sonuç</p>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 leading-relaxed">
              {result}
            </div>
          </div>
        )}
      </div>

      {/* Sağ panel — workflow + live feed */}
      <div className="flex-1 flex flex-col bg-gray-950">

        {/* Workflow — üst %65 */}
        <div style={{ height: "65%" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            colorMode="dark"
          >
            <Background color="#374151" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Live Feed — alt %35 */}
        <div className="border-t border-gray-800" style={{ height: "35%" }}>
          <LiveFeed projectId={projectId} />
        </div>

      </div>
    </div>
  );
}