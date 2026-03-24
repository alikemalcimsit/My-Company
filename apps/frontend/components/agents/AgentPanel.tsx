"use client";

import { useState }              from "react";
import { api, Agent }            from "@/lib/api";
import { Plus, Trash2, Bot }     from "lucide-react";

const ROLES   = ["backend-dev", "frontend-dev", "analyst", "content-writer", "qa-engineer"];
const MODELS = [
  "GPT_4",
  "GPT_3_5_TURBO",
  "GEMINI_PRO",
  "CLAUDE_SONNET",
  "LOCAL_LLM"
];

interface Props {
  projectId:      string;
  agents:         Agent[];
  onAgentsChange: (agents: Agent[]) => void;
}

export default function AgentPanel({ projectId, agents, onAgentsChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    name: "", role: "backend-dev", model: "GPT_3_5_TURBO", goal: "", efficiency: 5,
  });

  async function createAgent() {
    if (!form.name || !form.goal) return;
    const agent = await api.createAgent({ projectId, ...form });
    onAgentsChange([...agents, agent]);
    setForm({ name: "", role: "backend-dev", model: "GPT_3_5_TURBO", goal: "", efficiency: 5 });
    setShowForm(false);
  }

  async function deleteAgent(id: string) {
    await api.deleteAgent(id);
    onAgentsChange(agents.filter(a => a.id !== id));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-gray-400">AI Çalışanlar</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg text-xs transition-colors"
        >
          <Plus size={12} /> Çalışan Ekle
        </button>
      </div>

      {/* Yeni agent formu */}
      {showForm && (
        <div className="mb-6 p-4 border border-gray-700 rounded-xl bg-gray-900 space-y-3">
          <p className="text-sm text-gray-300 font-medium">Yeni AI Çalışan</p>
          <input
            placeholder="İsim (ör: Backend Dev 1)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
            >
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input
            placeholder="Hedef (ör: REST API ve backend servisleri yaz)"
            value={form.goal}
            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400">Verimlilik: {form.efficiency}</label>
            <input
              type="range" min={1} max={10} value={form.efficiency}
              onChange={e => setForm(f => ({ ...f, efficiency: Number(e.target.value) }))}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={createAgent}
              className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Oluştur
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white px-3 py-2 text-sm"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Agent listesi */}
      {agents.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bot size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz çalışan yok. İlk AI çalışanı ekle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="flex items-center gap-4 p-4 border border-gray-800 rounded-xl bg-gray-900"
            >
              <div className="w-10 h-10 bg-violet-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{agent.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{agent.role} · {agent.model}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{agent.goal}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <button
                  onClick={() => deleteAgent(agent.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}